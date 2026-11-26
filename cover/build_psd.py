# Build a layered 300-dpi PSD from the PNG layers rendered by layers.js.
import glob, sys
from PIL import Image
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer
from psd_tools.constants import Resource
from psd_tools.psd.image_resources import ImageResource, ResoulutionInfo, GridGuidesInfo
D, OUT = sys.argv[1], sys.argv[2]
ref = Image.open(f'{D}/00-composite.png'); W, H = ref.size
psd = PSDImage.new('RGB', (W, H), color=(0x14, 0x12, 0x14))
psd.append(PixelLayer.frompil(Image.new('RGB', (W, H), (0x14, 0x12, 0x14)), psd, 'Background', 0, 0))
for f in sorted(glob.glob(f'{D}/[0-9][0-9]-*.png')):
    if '/00-' in f: continue
    im = Image.open(f).convert('RGBA'); bb = im.split()[3].getbbox()
    if bb: psd.append(PixelLayer.frompil(im.crop(bb), psd, f.split('/')[-1][3:-4], bb[1], bb[0]))
ir = psd._record.image_resources
ir[Resource.RESOLUTION_INFO] = ImageResource(key=Resource.RESOLUTION_INFO, data=ResoulutionInfo(
    horizontal=300 << 16, horizontal_unit=1, width_unit=2, vertical=300 << 16, vertical_unit=1, height_unit=2))
px = lambda mm: round(mm * 300 / 25.4 * 32)
guides = [(px(x), 0) for x in (18, 169, 177, 200, 208, 359)] + [(px(y), 1) for y in (18, 234)]   # board edges, spine, folds
ir[Resource.GRID_AND_GUIDES_INFO] = ImageResource(key=Resource.GRID_AND_GUIDES_INFO,
    data=GridGuidesInfo(version=1, horizontal=576, vertical=576, data=guides))
psd.save(OUT)
