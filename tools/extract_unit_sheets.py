#!/usr/bin/env python3
"""Extract raw Codex unit canvases into the engine's 11-frame strip.

Raw deliveries are preserved in Git before this runs. Generator output is
normally eleven poses in one row or six poses over five poses, on either a
baked neutral checker or a near-black matte.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

PREFIXES = ("neu_", "ant_", "wasp_", "btl_", "man_", "ter_", "mot_")
FLIERS = {
    "wasp_drone_sheet", "wasp_jacket_sheet", "wasp_lancer_sheet",
    "wasp_hornet_sheet", "wasp_queen_sheet", "ter_alate_sheet",
    "mot_dustling_sheet", "mot_hawk_sheet", "mot_luna_sheet",
    "mot_witch_sheet", "mot_deathshead_sheet",
}
CELL, FRAMES = 256, 11


def keyed_rgba(image: Image.Image) -> np.ndarray:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8).copy()
    rgb = rgba[..., :3].astype(np.float32)
    corner = np.concatenate((
        rgb[:32, :32].reshape(-1, 3), rgb[:32, -32:].reshape(-1, 3),
        rgb[-32:, :32].reshape(-1, 3), rgb[-32:, -32:].reshape(-1, 3),
    ))
    dark_matte = float(np.median(corner)) < 80
    high, low = rgb.max(axis=2), rgb.min(axis=2)
    chroma = high - low
    if dark_matte:
        candidate = (high < 20.0) & (chroma < 12.0)
    else:
        candidate = (low > 215.0) & (chroma < 18.0)

    # Only matte-coloured pixels connected to an outer edge are background.
    # Enclosed white/cream paint (eyes, gloves, highlights, pale bodies)
    # remains opaque even when its RGB matches the checker.
    _, labels = cv2.connectedComponents(candidate.astype(np.uint8), connectivity=8)
    edge_labels = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
    edge_labels = edge_labels[edge_labels != 0]
    background = np.isin(labels, edge_labels)
    rgba[background, 3] = 0
    rgba[rgba[..., 3] == 0, :3] = 0
    return rgba


def content_bands(mask: np.ndarray) -> list[tuple[int, int]]:
    h, w = mask.shape
    occupied = mask.sum(axis=1) > max(3, int(w * 0.002))
    radius = max(2, h // 80)
    occupied = np.convolve(occupied.astype(np.uint8), np.ones(radius * 2 + 1), mode="same") > 0
    runs, start = [], None
    for y, value in enumerate(occupied):
        if value and start is None:
            start = y
        elif not value and start is not None:
            if y - start > h * 0.06:
                runs.append((start, y))
            start = None
    if start is not None:
        runs.append((start, h))
    return runs


def row_layout(mask: np.ndarray) -> tuple[list[tuple[int, int, int]], str]:
    h, w = mask.shape
    runs = content_bands(mask)
    two_rows = len(runs) >= 2 and runs[0][1] < runs[1][0]
    if not two_rows:
        return [(0, h, FRAMES)], "11x1"
    split = (runs[0][1] + runs[1][0]) // 2
    # Ignore any accidental third-row duplicate beneath the intended 6+5.
    bottom = min(h, runs[1][1] + max(8, int(h * 0.03)))
    return [(0, split, 6), (split, bottom, 5)], "6+5"


def isolate_poses(
    mask: np.ndarray,
    rows: list[tuple[int, int, int]],
    min_component_ratio: float = 0.0,
) -> tuple[list[np.ndarray], list[float]]:
    """Assign whole connected components to the nearest pose body.

    This avoids amputating wide poses at a geometric cell boundary. The
    largest component in each expected slot establishes that pose's centre;
    detached stars, dust, weapons, and projectiles follow the nearest centre.
    """
    height, width = mask.shape
    poses, pose_centres = [], []
    for y0, y1, count in rows:
        labels_count, labels, stats, centroids = cv2.connectedComponentsWithStats(
            mask[y0:y1].astype(np.uint8), connectivity=8
        )
        components = []
        for label in range(1, labels_count):
            area = int(stats[label, cv2.CC_STAT_AREA])
            if area >= 3:
                components.append((label, area, float(centroids[label, 0])))
        step = width / count
        # Main bodies are the largest well-separated components. This is
        # more reliable than exact grid bins when the generator spaces a
        # lunge or airborne pose unevenly.
        centres = []
        largest = max(c[1] for c in components)
        if min_component_ratio:
            components = [c for c in components if c[1] >= largest * min_component_ratio]
        body_candidates = [c for c in components if c[1] >= largest * 0.25]
        for _, _, cx in sorted(body_candidates, key=lambda c: c[1], reverse=True):
            if all(abs(cx - existing) >= step * 0.42 for existing in centres):
                centres.append(cx)
                if len(centres) == count:
                    break
        centres = np.asarray(sorted(centres[:count]))

        assignments = [[] for _ in range(len(centres))]
        for label, area, cx in components:
            distances = np.abs(centres - cx)
            nearest = int(np.argmin(distances))
            if distances[nearest] <= step * 0.80:
                assignments[nearest].append(label)
        for index, assigned in enumerate(assignments):
            local = np.isin(labels, assigned)
            pose = np.zeros((height, width), dtype=bool)
            pose[y0:y1] = local
            poses.append(pose)
            pose_centres.append(float(centres[index]))
        # A generator occasionally returns ten distinct poses despite an
        # eleven-pose request. Duplicate the row's first neutral pose as its
        # recovery rather than inventing pixels or leaving an empty frame.
        while len(assignments) < count:
            poses.append(poses[-len(assignments)].copy())
            pose_centres.append(pose_centres[-len(assignments)])
            assignments.append([])
    return poses, pose_centres


def content_box(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    if not len(xs):
        raise ValueError("empty extracted frame")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def extract(path: Path) -> tuple[str, float]:
    source = keyed_rgba(Image.open(path))
    mask = source[..., 3] > 18
    rows, arrangement = row_layout(mask)
    min_ratio = 0.015 if path.stem == "ter_alate_sheet" else 0.0
    pose_masks, centres = isolate_poses(mask, rows, min_ratio)
    boxes = [content_box(pose) for pose in pose_masks]
    move_bottom = float(np.median([box[3] for box in boxes[:6]]))
    attack_bottom = float(np.median([box[3] for box in boxes[6:]]))
    baselines = [move_bottom] * 6 + [attack_bottom] * 5
    anchor = 190 if path.stem in FLIERS else 220

    limits = []
    for cx, box, baseline in zip(centres, boxes, baselines):
        left, right = max(1.0, cx - box[0]), max(1.0, box[2] - cx)
        up, down = max(1.0, baseline - box[1]), max(1.0, box[3] - baseline)
        limits.extend((120.0 / left, 120.0 / right, (anchor - 8.0) / up, (248.0 - anchor) / down))
    scale = min(limits)

    output = Image.new("RGBA", (CELL * FRAMES, CELL), (0, 0, 0, 0))
    for index, (pose_mask, cx, box, baseline) in enumerate(zip(pose_masks, centres, boxes, baselines)):
        x0, y0, x1, y1 = box
        isolated = source[y0:y1, x0:x1].copy()
        isolated[~pose_mask[y0:y1, x0:x1], 3] = 0
        isolated[isolated[..., 3] == 0, :3] = 0
        crop = Image.fromarray(isolated, "RGBA")
        resized = crop.resize(
            (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
            Image.Resampling.LANCZOS,
        )
        dst_x = index * CELL + round(CELL / 2 + (x0 - cx) * scale)
        dst_y = round(anchor + (y0 - baseline) * scale)
        output.alpha_composite(resized, (dst_x, dst_y))
    output.save(path, optimize=True)
    return arrangement, scale


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="*", type=Path)
    parser.add_argument("--root", type=Path, default=Path("assets/sprites"))
    args = parser.parse_args()
    paths = args.paths or sorted(p for p in args.root.glob("*_sheet.png") if p.name.startswith(PREFIXES))
    for path in paths:
        arrangement, scale = extract(path)
        print(f"{path.name}: {arrangement}, scale={scale:.3f}, 2816x256")


if __name__ == "__main__":
    main()
