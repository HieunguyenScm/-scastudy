export type TutorSource = {
  label: string;
  title: string;
  author: string;
  chapter: string;
  pages: string;
  note: string;
};

export type TutorPayload = {
  answer: string;
  model?: string;
  degraded: boolean;
  requestId: string;
  sources: TutorSource[];
};

export default function TutorAnswer({ response }: { response: TutorPayload }) {
  return (
    <div className="tutor-response">
      {response.degraded ? (
        <p className="tutor-degraded">
          Tutor đang ở chế độ dự phòng. Nội dung vẫn bám roadmap nhưng có thể ít chi tiết hơn.
        </p>
      ) : null}
      <div className="tutor-answer">{response.answer}</div>
      {response.sources.length ? (
        <details className="tutor-sources">
          <summary>{response.sources.length} nguồn được dùng</summary>
          <ol>
            {response.sources.map((source, index) => (
              <li key={`${source.label}-${source.title}-${index}`}>
                <span>{source.label}</span>
                <strong>{source.title}</strong>
                {source.author ? <small>{source.author}</small> : null}
                <p>
                  {[source.chapter, source.pages].filter(Boolean).join(" · ")}
                </p>
                {source.note ? <small>{source.note}</small> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      <small className="tutor-request-meta">
        {response.model ? `Model ${response.model} · ` : ""}Request {response.requestId}
      </small>
    </div>
  );
}
