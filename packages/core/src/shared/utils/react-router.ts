import { type MetaDescriptor } from 'react-router';

type BuildMetaInput = {
  description: string;
  image?: string;
  title: string;
};

/**
 * Builds the meta descriptors for a page. The title and description are
 * required, but the image is optional. If more properties are needed, they can
 * be appended to the return value.
 */
export function buildMeta({
  description,
  image,
  title,
}: BuildMetaInput): MetaDescriptor[] {
  const meta = [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
  ];

  if (image) {
    meta.push({ property: 'og:image', content: image });
  }

  return meta;
}
