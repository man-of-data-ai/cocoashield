"""
Calcule le vrai CAM (Class Activation Mapping, Zhou et al. 2016) sur une image, avec
le modele a tete simplifiee (GAP -> Linear direct). Aucune retropropagation necessaire
(contrainte ExecuTorch = inference seule) : le CAM est un simple produit poids x carte
de features, exactement comme ce sera calcule dans l'app.

Convention du modele : sortie = logit "healthy". CAM_healthy(x,y) = sum_k w_k * f_k(x,y).
Pour visualiser "ou le modele voit la maladie", on utilise le CAM inverse (contribution
vers cssvd), soit CAM_cssvd = -CAM_healthy (poids negatifs de la healthy = evidence cssvd).
"""
import sys
import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
import timm
import numpy as np
from PIL import Image

IMG_SIZE = 260
HERE = os.path.dirname(os.path.abspath(__file__))
CKPT_PATH = os.path.join(HERE, "camhead_model.pt")

image_path = sys.argv[1]
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "cam_result.png")


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

tf = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

orig_img = Image.open(image_path).convert("RGB").resize((IMG_SIZE, IMG_SIZE))
x = tf(orig_img).unsqueeze(0)

with torch.no_grad():
    feats = model.backbone.forward_features(x)  # (1, 960, 9, 9)
    logit = model(x).item()
    prob_healthy = torch.sigmoid(torch.tensor(logit)).item()

    weights = model.classifier.weight[0]  # (960,) contributions vers "healthy"
    # CAM vers cssvd = poids inverses (ce qui pousse VERS la maladie)
    cam_cssvd = torch.einsum("c,chw->hw", -weights, feats[0])  # (9, 9)
    cam_cssvd = F.relu(cam_cssvd)
    cam_cssvd = cam_cssvd / (cam_cssvd.max() + 1e-8)

label = "cssvd (malade)" if prob_healthy < 0.5 else "healthy (saine)"
confidence = (1 - prob_healthy) if prob_healthy < 0.5 else prob_healthy
print(f"Prediction: {label} — confiance {confidence:.1%}")
print(f"CAM shape: {cam_cssvd.shape}, min={cam_cssvd.min():.3f} max={cam_cssvd.max():.3f}")

# Upsample 9x9 -> 260x260 (bilinear) et colorisation bleu->jaune->rouge
cam_img = cam_cssvd.unsqueeze(0).unsqueeze(0)  # (1,1,9,9)
cam_up = F.interpolate(cam_img, size=(IMG_SIZE, IMG_SIZE), mode="bilinear", align_corners=False)
cam_up = cam_up.squeeze().numpy()  # (260, 260) in [0,1]


def colorize(v):
    """Bleu (peu) -> jaune -> rouge (beaucoup), meme palette que l'overlay React Native."""
    t = np.clip(v, 0, 1)
    r = np.where(t < 0.5, 30 + (t / 0.5) * 225, 255)
    g = np.where(t < 0.5, 60 + (t / 0.5) * 195, 255 - ((t - 0.5) / 0.5) * 205)
    b = np.where(t < 0.5, 200 - (t / 0.5) * 180, 20 - ((t - 0.5) / 0.5) * 20)
    return np.stack([r, g, b], axis=-1).astype(np.uint8)


heat_rgb = colorize(cam_up)
orig_arr = np.array(orig_img).astype(np.float32)
alpha = 0.5
blended = (orig_arr * (1 - alpha) + heat_rgb.astype(np.float32) * alpha).astype(np.uint8)

# Cote a cote : original | heatmap seule | overlay
combined = np.concatenate([orig_arr.astype(np.uint8), heat_rgb, blended], axis=1)
Image.fromarray(combined).save(out_path)
print(f"Image sauvegardee: {out_path}")
