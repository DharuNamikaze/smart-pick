import { marked } from 'marked';

const parseMarkdown = (markdown) => {
  return marked(markdown);
};

export default parseMarkdown;
