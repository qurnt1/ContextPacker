import { memo } from 'react';
import dockerIcon from 'simple-icons/icons/docker.svg?raw';
import npmIcon from 'simple-icons/icons/npm.svg?raw';
import gitIcon from 'simple-icons/icons/git.svg?raw';
import javascriptIcon from 'simple-icons/icons/javascript.svg?raw';
import reactIcon from 'simple-icons/icons/react.svg?raw';
import typescriptIcon from 'simple-icons/icons/typescript.svg?raw';
import pythonIcon from 'simple-icons/icons/python.svg?raw';
import rustIcon from 'simple-icons/icons/rust.svg?raw';
import goIcon from 'simple-icons/icons/go.svg?raw';
import javaIcon from 'simple-icons/icons/openjdk.svg?raw';
import vueIcon from 'simple-icons/icons/vuedotjs.svg?raw';
import svelteIcon from 'simple-icons/icons/svelte.svg?raw';
import terraformIcon from 'simple-icons/icons/terraform.svg?raw';
import markdownIcon from 'simple-icons/icons/markdown.svg?raw';
import yamlIcon from 'simple-icons/icons/yaml.svg?raw';
import {
  FileCog,
  FileJson,
  FileText,
  FileType2,
  ListTree,
} from 'lucide-react';
import { getFileTypeInfo } from '../utils/languageBadge';

const TYPE_ICONS = {
  json: FileJson,
  markdown: FileText,
  yaml: ListTree,
  text: FileText,
  config: FileCog,
  generic: FileType2,
};

const TYPE_BRAND_ICONS = {
  docker: dockerIcon,
  package: npmIcon,
  git: gitIcon,
  javascript: javascriptIcon,
  react: reactIcon,
  typescript: typescriptIcon,
  python: pythonIcon,
  rust: rustIcon,
  go: goIcon,
  java: javaIcon,
  vue: vueIcon,
  svelte: svelteIcon,
  terraform: terraformIcon,
  markdown: markdownIcon,
  yaml: yamlIcon,
};

function getBrandMarkup(rawSvg) {
  return rawSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || '';
}

const FileTypeIcon = memo(function FileTypeIcon({ fileName, extension, size = 15, className = '' }) {
  const fileType = getFileTypeInfo(fileName, extension);
  const brandIcon = TYPE_BRAND_ICONS[fileType.type];
  const Icon = TYPE_ICONS[fileType.type] || FileType2;

  if (brandIcon) {
    return (
      <svg
        aria-hidden="true"
        className={`flex-shrink-0 ${className}`}
        data-file-type={fileType.type}
        height={size}
        viewBox="0 0 24 24"
        width={size}
        fill="currentColor"
        style={{ color: fileType.color }}
        title={fileType.label}
        dangerouslySetInnerHTML={{ __html: getBrandMarkup(brandIcon) }}
      />
    );
  }

  return (
    <Icon
      aria-hidden="true"
      className={`flex-shrink-0 ${className}`}
      data-file-type={fileType.type}
      size={size}
      strokeWidth={1.8}
      style={{ color: fileType.color }}
      title={fileType.label}
    />
  );
});

export default FileTypeIcon;
