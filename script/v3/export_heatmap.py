"""
Exporte une "heatmap d'activation" embarquee, calculable sans gradients (contrainte
ExecuTorch = inference seule, pas de backward pass sur mobile).

Principe :
1. forward_features(x) -> (1, 960, 9, 9) : derniere carte de features AVANT le
   global_pool (contrairement a conv_head qui est deja ecrase en 1x1, cf. audit).
2. Norme L2 par position spatiale a travers les 960 canaux -> (1, 9, 9) : "energie"
   d'activation du reseau a chaque endroit de l'image (proxy de saillance, pas un vrai
   Grad-CAM class-discriminant, mais une vraie carte spatiale sans backprop).
3. Normalisation min-max par image + temperature -> aplati en (1, 81) "classes" pour
   reutiliser tel quel l'API ClassificationModule.fromCustomModel (meme pipeline de
   preprocessing natif deja valide sur le telephone), le softmax natif etant detourne
   pour agir comme une normalisation relative entre les 81 cases de la grille 9x9.
"""
import os
import torch
import torch.nn as nn
import timm
from executorch.exir import to_edge_transform_and_lower
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

IMG_SIZE = 260
TEMPERATURE = 3.0  # + eleve = grille plus "peaky"/contrastee, + bas = plus lisse
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "best_model.pt")

base_model = timm.create_model("mobilenetv3_large_100", pretrained=False, num_classes=1, drop_rate=0.2)
base_model.load_state_dict(torch.load(CKPT_PATH, map_location="cpu"))
base_model.eval()


class HeatmapWrapper(nn.Module):
    def __init__(self, model, temperature=TEMPERATURE):
        super().__init__()
        self.model = model
        self.temperature = temperature

    def forward(self, x):
        feats = self.model.forward_features(x)  # (1, 960, Hf, Wf)
        energy = torch.linalg.vector_norm(feats, dim=1)  # (1, Hf, Wf)
        n = energy.shape[0]
        flat = energy.reshape(n, -1)  # (1, Hf*Wf)
        min_v = flat.min(dim=1, keepdim=True).values
        max_v = flat.max(dim=1, keepdim=True).values
        norm = (flat - min_v) / (max_v - min_v + 1e-8)  # (1, Hf*Wf) in [0,1]
        return norm * self.temperature  # "logits" pour softmax natif cote app


model = HeatmapWrapper(base_model)
model.eval()

with torch.no_grad():
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
    feats_shape = base_model.forward_features(dummy).shape
    out = model(dummy)
    print(f"forward_features shape: {feats_shape}")
    print(f"Sortie heatmap (logits grille): {out.shape}")
    GRID_H, GRID_W = feats_shape[2], feats_shape[3]
    assert out.shape[1] == GRID_H * GRID_W

example_input = (torch.randn(1, 3, IMG_SIZE, IMG_SIZE),)
exported_program = torch.export.export(model, example_input)
print("torch.export reussi")

edge_program = to_edge_transform_and_lower(
    exported_program,
    partitioner=[XnnpackPartitioner()],
)
print("Lowering XNNPACK reussi")

executorch_program = edge_program.to_executorch()

pte_path = os.path.join(HERE, "cocoashield_v3_heatmap.pte")
with open(pte_path, "wb") as f:
    f.write(executorch_program.buffer)

print(f"ExecuTorch (heatmap {GRID_H}x{GRID_W}) exporte: {os.path.getsize(pte_path) / 1e6:.1f} MB -> {pte_path}")
print(f"GRID_H={GRID_H} GRID_W={GRID_W} (a reporter cote app)")
