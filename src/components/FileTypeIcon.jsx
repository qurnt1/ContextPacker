import { memo } from 'react';
import dockerIcon from 'material-icon-theme/icons/docker.svg?raw';
import npmIcon from 'material-icon-theme/icons/npm.svg?raw';
import gitIcon from 'material-icon-theme/icons/git.svg?raw';
import javascriptIcon from 'material-icon-theme/icons/javascript.svg?raw';
import reactIcon from 'material-icon-theme/icons/react.svg?raw';
import typescriptIcon from 'material-icon-theme/icons/typescript.svg?raw';
import pythonIcon from 'material-icon-theme/icons/python.svg?raw';
import rustIcon from 'material-icon-theme/icons/rust.svg?raw';
import goIcon from 'material-icon-theme/icons/go.svg?raw';
import javaIcon from 'material-icon-theme/icons/java.svg?raw';
import vueIcon from 'material-icon-theme/icons/vue.svg?raw';
import svelteIcon from 'material-icon-theme/icons/svelte.svg?raw';
import terraformIcon from 'material-icon-theme/icons/terraform.svg?raw';
import markdownIcon from 'material-icon-theme/icons/markdown.svg?raw';
import yamlIcon from 'material-icon-theme/icons/yaml.svg?raw';
import jsonIcon from 'material-icon-theme/icons/json.svg?raw';
import cssIcon from 'material-icon-theme/icons/css.svg?raw';
import sassIcon from 'material-icon-theme/icons/sass.svg?raw';
import lessIcon from 'material-icon-theme/icons/less.svg?raw';
import htmlIcon from 'material-icon-theme/icons/html.svg?raw';
import readmeIcon from 'material-icon-theme/icons/readme.svg?raw';
import licenseIcon from 'material-icon-theme/icons/license.svg?raw';
import tsconfigIcon from 'material-icon-theme/icons/tsconfig.svg?raw';
import viteIcon from 'material-icon-theme/icons/vite.svg?raw';
import vitestIcon from 'material-icon-theme/icons/vitest.svg?raw';
import textIcon from 'material-icon-theme/icons/document.svg?raw';
import configIcon from 'material-icon-theme/icons/settings.svg?raw';
import genericIcon from 'material-icon-theme/icons/file.svg?raw';
import { getFileTypeInfo } from '../utils/languageBadge';

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
  json: jsonIcon,
  css: cssIcon,
  scss: sassIcon,
  less: lessIcon,
  html: htmlIcon,
  readme: readmeIcon,
  license: licenseIcon,
  tsconfig: tsconfigIcon,
  vite: viteIcon,
  vitest: vitestIcon,
  text: textIcon,
  config: configIcon,
  generic: genericIcon,
};

function getBrandMarkup(rawSvg) {
  return rawSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || '';
}

const FileTypeIcon = memo(function FileTypeIcon({ fileName, extension, size = 15, className = '' }) {
  const fileType = getFileTypeInfo(fileName, extension);
  const icon = TYPE_BRAND_ICONS[fileType.type] || genericIcon;

  return (
    <svg
      aria-hidden="true"
      className={`flex-shrink-0 ${className}`}
      data-file-type={fileType.type}
      height={size}
      viewBox="0 0 16 16"
      width={size}
      title={fileType.label}
      dangerouslySetInnerHTML={{ __html: getBrandMarkup(icon) }}
    />
  );
});

export default FileTypeIcon;
