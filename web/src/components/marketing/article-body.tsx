import Link from "next/link";
import type { ReactNode } from "react";

/* Renders the small markdown subset used in lib/content/blog.ts into semantic HTML — no dangerouslySetInnerHTML. */

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[2] && m[3]) {
      const href = m[3];
      out.push(
        href.startsWith("/") ? (
          <Link key={k++} href={href}>
            {m[2]}
          </Link>
        ) : (
          <a key={k++} href={href} rel="noopener noreferrer" target="_blank">
            {m[2]}
          </a>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function ArticleBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <div className="prose-spatial">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0]!;
        if (first.startsWith("## ")) {
          const text = first.slice(3).trim();
          return (
            <h2 key={i} id={slug(text)} className="scroll-mt-28">
              {text}
            </h2>
          );
        }
        if (first.startsWith("### ")) return <h3 key={i}>{first.slice(4).trim()}</h3>;
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\d+\.\s/, ""))}</li>
              ))}
            </ol>
          );
        }
        if (first.startsWith("> ")) {
          return (
            <blockquote key={i}>
              <p>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</p>
            </blockquote>
          );
        }
        if (first.startsWith("|")) {
          const rows = lines
            .filter((l) => !/^\|\s*-/.test(l))
            .map((l) =>
              l
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((c) => c.trim()),
            );
          const [head, ...rest] = rows;
          return (
            <div key={i} className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    {head!.map((c, j) => (
                      <th key={j} scope="col">
                        {inline(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r, j) => (
                    <tr key={j}>
                      {r.map((c, n) => (
                        <td key={n}>{inline(c)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
