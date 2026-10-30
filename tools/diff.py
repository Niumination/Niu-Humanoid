import sys
from PIL import Image
import numpy as np
a=np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float)
b=np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(float)
d=np.abs(a-b); m=d.max(2)>8
print('%s vs %s: >8/255 %.2f%%  MAE %.2f  bright %.1f / %.1f' % (sys.argv[1].split('/')[-1], sys.argv[2].split('/')[-1], m.mean()*100, d.mean(), a.mean(), b.mean()))
