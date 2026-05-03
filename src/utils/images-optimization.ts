import type { ImageMetadata } from 'astro';
import type { HTMLAttributes } from 'astro/types';

export interface ImageProps extends Omit<HTMLAttributes<'img'>, 'src'> {
  src?: string | ImageMetadata | null;
  width?: string | number | null;
  height?: string | number | null;
  alt?: string | null;
  loading?: 'eager' | 'lazy' | null;
  decoding?: 'sync' | 'async' | 'auto' | null;
  style?: string;
  srcset?: string | null;
  sizes?: string | null;
  fetchpriority?: 'high' | 'low' | 'auto' | null;
  layout?: string;
  widths?: number[] | null;
  aspectRatio?: string | number | null;
  objectPosition?: string;
  format?: string;
}

export type ImagesOptimizer = (
  image: ImageMetadata | string,
  breakpoints: number[],
  width?: number,
  height?: number,
  format?: string
) => Promise<Array<{ src: string; width: number }>>;

export const isUnpicCompatible = (_image: string) => false;

export const astroAssetsOptimizer: ImagesOptimizer = async (_image, _breakpoints) => [];

export const unpicOptimizer: ImagesOptimizer = async (_image, _breakpoints) => [];

export async function getImagesOptimized(
  image: ImageMetadata | string,
  { width, height, sizes, layout, style = '', ...rest }: ImageProps,
  _transform: ImagesOptimizer = () => Promise.resolve([])
): Promise<{ src: string; attributes: HTMLAttributes<'img'> }> {
  return {
    src: typeof image === 'string' ? image : image.src,
    attributes: {
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      style: style || undefined,
      ...rest,
    },
  };
}
