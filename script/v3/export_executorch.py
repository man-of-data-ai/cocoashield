import os
import torch
import timm
from executorch.exir import to_edge_transform_and_lower
from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

IMG_SIZE = 260
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "best_model.pt")

model = timm.create_model("mobilenetv3_large_100", pretrained=False, num_classes=1, drop_rate=0.2)
state_dict = torch.load(CKPT_PATH, map_location="cpu")
model.load_state_dict(state_dict)
model.eval()

print(f"Modele charge: {sum(p.numel() for p in model.parameters())/1e6:.1f}M parametres")

example_input = (torch.randn(1, 3, IMG_SIZE, IMG_SIZE),)

exported_program = torch.export.export(model, example_input)
print("torch.export reussi")

edge_program = to_edge_transform_and_lower(
    exported_program,
    partitioner=[XnnpackPartitioner()],  # backend optimise CPU mobile (ARM/x86)
)
print("Lowering XNNPACK reussi")

executorch_program = edge_program.to_executorch()

pte_path = os.path.join(HERE, "cocoashield_v3.pte")
with open(pte_path, "wb") as f:
    f.write(executorch_program.buffer)

print(f"ExecuTorch exporte: {os.path.getsize(pte_path) / 1e6:.1f} MB -> {pte_path}")
