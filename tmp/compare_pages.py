import os
import numpy as np
from PIL import Image

def compare_images(ref_path, gen_path):
    ref = Image.open(ref_path).convert('RGB')
    gen = Image.open(gen_path).convert('RGB')
    
    if ref.size != gen.size:
        return {'error': f'Size mismatch: ref={ref.size}, gen={gen.size}'}
        
    arr_ref = np.array(ref, dtype=np.float32)
    arr_gen = np.array(gen, dtype=np.float32)
    
    diff = np.abs(arr_ref - arr_gen)
    mean_diff = np.mean(diff)
    
    # Non-white pixels (content pixels)
    ref_mask = np.mean(arr_ref, axis=2) < 252
    gen_mask = np.mean(arr_gen, axis=2) < 252
    
    overlap = np.logical_and(ref_mask, gen_mask).sum()
    union = np.logical_or(ref_mask, gen_mask).sum()
    iou = overlap / union if union > 0 else 1.0
    
    # Check vertical bounds of content
    ref_y = np.where(ref_mask.any(axis=1))[0]
    gen_y = np.where(gen_mask.any(axis=1))[0]
    
    ref_y_min, ref_y_max = (int(ref_y[0]), int(ref_y[-1])) if len(ref_y) else (0, 0)
    gen_y_min, gen_y_max = (int(gen_y[0]), int(gen_y[-1])) if len(gen_y) else (0, 0)
    
    # Footer check (y in 1460..1560)
    ref_footer_y = ref_y_max
    gen_footer_y = gen_y_max
    
    return {
        'mean_diff': round(float(mean_diff), 2),
        'iou': round(float(iou), 3),
        'ref_y': (ref_y_min, ref_y_max),
        'gen_y': (gen_y_min, gen_y_max),
    }

print("=== CANADA PAGE COMPARISONS ===")
for i in range(1, 24):
    ref_p = f'public/sample-pdf-pages/Canada/ca{i}.png'
    gen_p = f'tmp/rendered-test/Canada/ca{i}.png'
    res = compare_images(ref_p, gen_p)
    print(f"Page {i:02d}: IOU={res['iou']:0.3f}, MeanDiff={res['mean_diff']:5.2f}, Ref Y=[{res['ref_y'][0]},{res['ref_y'][1]}], Gen Y=[{res['gen_y'][0]},{res['gen_y'][1]}]")

print("\n=== US PAGE COMPARISONS ===")
for i in range(1, 23):
    ref_p = f'public/sample-pdf-pages/US/us{i}.png'
    gen_p = f'tmp/rendered-test/US/us{i}.png'
    res = compare_images(ref_p, gen_p)
    print(f"Page {i:02d}: IOU={res['iou']:0.3f}, MeanDiff={res['mean_diff']:5.2f}, Ref Y=[{res['ref_y'][0]},{res['ref_y'][1]}], Gen Y=[{res['gen_y'][0]},{res['gen_y'][1]}]")
