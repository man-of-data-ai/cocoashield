"""
Reexporte best_model.pt (sortie sigmoid binaire [1,1]) en un modele a 2 logits [1,2]
compatible avec le contrat softmax de ClassificationModule.fromCustomModel de
react-native-executorch, SANS reentrainement.

Astuce : softmax([z, 0])[0] = exp(z) / (exp(z) + exp(0)) = exp(z) / (exp(z) + 1) = sigmoid(z).
Donc en sortant [z, 0] au lieu de sigmoid(z), le softmax applique cote natif reproduit
EXACTEMENT la meme probabilite pour l'index 0.

Convention retenue : index 0 = Healthy (correspond a sigmoid(z) = P(healthy) dans le modele
d'origine), index 1 = Cssvd (logit fixe a 0).
"""
import os
import torch
import torch.nn as nn
import timm
from executorch.exir import to_edge_transform_and_lower
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

IMG_SIZE = 260
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "best_model.pt")

base_model = timm.create_model("mobilenetv3_large_100", pretrained=False, num_classes=1, drop_rate=0.2)
base_model.load_state_dict(torch.load(CKPT_PATH, map_location="cpu"))
base_model.eval()


class TwoClassWrapper(nn.Module):
    """Sortie [1,2] = [logit_healthy, 0] au lieu de sigmoid([1,1]).
    softmax(...)[0] == sigmoid(logit_healthy), donc equivalent exact au modele d'origine."""

    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, x):
        z = self.model(x)  # (N, 1)
        zeros = torch.zeros_like(z)
        return torch.cat([z, zeros], dim=1)  # (N, 2) -> [healthy_logit, cssvd_logit=0]


model = TwoClassWrapper(base_model)
model.eval()

print(f"Modele charge: {sum(p.numel() for p in base_model.parameters())/1e6:.1f}M parametres")

example_input = (torch.randn(1, 3, IMG_SIZE, IMG_SIZE),)

# Verification rapide de l'equivalence mathematique avant export
with torch.no_grad():
    dummy = torch.randn(4, 3, IMG_SIZE, IMG_SIZE)
    orig_prob_healthy = torch.sigmoid(base_model(dummy)).squeeze(1)
    two_class_logits = model(dummy)
    softmax_prob_healthy = torch.softmax(two_class_logits, dim=1)[:, 0]
    max_diff = (orig_prob_healthy - softmax_prob_healthy).abs().max().item()
    print(f"Verification equivalence sigmoid vs softmax[0]: diff max = {max_diff:.8f}")
    assert max_diff < 1e-5, "L'astuce softmax ne reproduit pas exactement le sigmoid d'origine !"

exported_program = torch.export.export(model, example_input)
print("torch.export reussi")

edge_program = to_edge_transform_and_lower(
    exported_program,
    partitioner=[XnnpackPartitioner()],
)
print("Lowering XNNPACK reussi")

executorch_program = edge_program.to_executorch()

pte_path = os.path.join(HERE, "cocoashield_v3_classifier.pte")
with open(pte_path, "wb") as f:
    f.write(executorch_program.buffer)

print(f"ExecuTorch (2-classes) exporte: {os.path.getsize(pte_path) / 1e6:.1f} MB -> {pte_path}")
