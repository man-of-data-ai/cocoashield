"""Test-time augmentation legere : 5 passes avec variations mineures (crop aleatoire,
flip horizontal) sur la meme image, vote majoritaire sur le label predit. Utile pour
les cas limites (confiance proche de 50%) ou une seule inference peut basculer d'un
cote ou de l'autre a cause d'un cadrage/leger bruit."""
import sys
import os
import random
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
import timm
from PIL import Image

IMG_SIZE = 260
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "camhead_model.pt")

image_path = sys.argv[1]
N_RUNS = int(sys.argv[2]) if len(sys.argv) > 2 else 5


class CamHeadModel(nn.Module):
    def __init__(self, backbone_name="mobilenetv3_large_100"):
        super().__init__()
        self.backbone = timm.create_model(backbone_name, pretrained=False, num_classes=1, drop_rate=0.0)
        self.classifier = nn.Linear(960, 1)

    def forward(self, x):
        feats = self.backbone.forward_features(x)
        pooled = F.adaptive_avg_pool2d(feats, 1).flatten(1)
        return self.classifier(pooled)


model = CamHeadModel()
model.load_state_dict(torch.load(CKPT_PATH, map_location="cpu"))
model.eval()

base_img = Image.open(image_path).convert("RGB")

tta_tf = T.Compose([
    T.RandomResizedCrop(IMG_SIZE, scale=(0.85, 1.0), ratio=(0.95, 1.05)),
    T.RandomHorizontalFlip(),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

results = []
random.seed()
torch.manual_seed(torch.seed())

with torch.no_grad():
    for i in range(N_RUNS):
        x = tta_tf(base_img).unsqueeze(0)
        logit = model(x).item()
        prob_healthy = torch.sigmoid(torch.tensor(logit)).item()
        label = "healthy" if prob_healthy >= 0.5 else "cssvd"
        confidence = prob_healthy if label == "healthy" else 1 - prob_healthy
        results.append((label, confidence))
        print(f"Run {i+1}/{N_RUNS}: {label} ({confidence:.1%})")

healthy_votes = sum(1 for l, _ in results if l == "healthy")
cssvd_votes = N_RUNS - healthy_votes
majority = "healthy" if healthy_votes > cssvd_votes else "cssvd"
avg_conf = sum(c for l, c in results if l == majority) / max(1, sum(1 for l, _ in results if l == majority))

print(f"\nVote majoritaire ({N_RUNS} passes): {healthy_votes} healthy / {cssvd_votes} cssvd")
print(f"=> {majority.upper()} (confiance moyenne sur les votes majoritaires: {avg_conf:.1%})")
