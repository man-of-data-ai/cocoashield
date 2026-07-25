"""Export ExecuTorch du modele a tete simplifiee (GAP->Linear), avec l'astuce
softmax([z,0]) == sigmoid(z) pour rester compatible ClassificationModule (cf. model_v3)."""
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


class TwoClassWrapper(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, x):
        z = self.model(x)
        zeros = torch.zeros_like(z)
        return torch.cat([z, zeros], dim=1)  # index0=healthy, index1=cssvd


model = TwoClassWrapper(base)
model.eval()

with torch.no_grad():
    dummy = torch.randn(4, 3, IMG_SIZE, IMG_SIZE)
    orig_prob_healthy = torch.sigmoid(base(dummy)).squeeze(1)
    two_class_logits = model(dummy)
    softmax_prob_healthy = torch.softmax(two_class_logits, dim=1)[:, 0]
    max_diff = (orig_prob_healthy - softmax_prob_healthy).abs().max().item()
    print(f"Verification equivalence: diff max = {max_diff:.8f}")
    assert max_diff < 1e-5

example_input = (torch.randn(1, 3, IMG_SIZE, IMG_SIZE),)
exported_program = torch.export.export(model, example_input)
edge_program = to_edge_transform_and_lower(exported_program, partitioner=[XnnpackPartitioner()])
executorch_program = edge_program.to_executorch()

pte_path = os.path.join(HERE, "cocoashield_camhead_classifier.pte")
with open(pte_path, "wb") as f:
    f.write(executorch_program.buffer)
print(f"Exporte: {os.path.getsize(pte_path) / 1e6:.1f} MB -> {pte_path}")
