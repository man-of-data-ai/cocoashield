"""Export ExecuTorch de la carte CAM (Class Activation Mapping) precise et
class-discriminante, calculee sans gradients : CAM_cssvd = ReLU(sum_k -w_k * f_k(x,y)).
Sortie aplatie en 81 valeurs (grille 9x9), reutilisant ClassificationModule pour le meme
pipeline de preprocessing natif que le classifieur (deja valide sur device)."""
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm
from executorch.exir import to_edge_transform_and_lower
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

IMG_SIZE = 260
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "camhead_model.pt")


class CamHeadModel(nn.Module):
    def __init__(self, backbone_name="mobilenetv3_large_100"):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=1, drop_rate=0.0)
        self.classifier = nn.Linear(960, 1)

    def forward(self, x):
        feats = self.backbone.forward_features(x)
        pooled = F.adaptive_avg_pool2d(feats, 1).flatten(1)
        return self.classifier(pooled)


base = CamHeadModel()
base.load_state_dict(torch.load(CKPT_PATH, map_location="cpu"))
base.eval()


TEMPERATURE = 3.0  # ClassificationModule applique un softmax natif obligatoire (contrat de
# l'API) : on sort donc des "logits" (carte min-max normalisee puis mise a l'echelle),
# pas une probabilite deja normalisee, sinon le softmax re-deformerait nos valeurs.


class CamWrapper(nn.Module):
    """Sortie : carte CAM vers la classe cssvd, aplatie (N, 81) en "logits" pour le
    softmax natif de ClassificationModule (meme pipeline de preprocessing que le
    classifieur, deja valide sur device)."""

    def __init__(self, model, temperature=TEMPERATURE):
        super().__init__()
        self.backbone = model.backbone
        self.weights = nn.Parameter(-model.classifier.weight[0].detach().clone(), requires_grad=False)
        self.temperature = temperature

    def forward(self, x):
        feats = self.backbone.forward_features(x)  # (N, 960, 9, 9)
        cam = torch.einsum("c,nchw->nhw", self.weights, feats)  # (N, 9, 9)
        cam = F.relu(cam)
        n = cam.shape[0]
        flat = cam.reshape(n, -1)
        min_v = flat.min(dim=1, keepdim=True).values
        max_v = flat.max(dim=1, keepdim=True).values
        norm = (flat - min_v) / (max_v - min_v + 1e-8)  # [0,1] par image
        return norm * self.temperature  # "logits" pour softmax natif cote app


model = CamWrapper(base)
model.eval()

with torch.no_grad():
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
    out = model(dummy)
    print(f"Sortie CAM: {out.shape}, min={out.min():.3f} max={out.max():.3f}")
    assert out.shape[1] == 81

example_input = (torch.randn(1, 3, IMG_SIZE, IMG_SIZE),)
exported_program = torch.export.export(model, example_input)
edge_program = to_edge_transform_and_lower(exported_program, partitioner=[XnnpackPartitioner()])
executorch_program = edge_program.to_executorch()

pte_path = os.path.join(HERE, "cocoashield_camhead_cam.pte")
with open(pte_path, "wb") as f:
    f.write(executorch_program.buffer)
print(f"Exporte: {os.path.getsize(pte_path) / 1e6:.1f} MB -> {pte_path}")
