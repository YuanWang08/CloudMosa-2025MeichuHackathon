import MarkdownIt from 'markdown-it'

// Configure markdown-it: disable raw HTML to avoid XSS, enable linkify and soft line breaks
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

export function renderMarkdown(text: string | null | undefined): string {
  const src = (text ?? '').toString()
  // Basic guard: markdown-it escapes unsafe content when html=false
  return md.render(src)
}
