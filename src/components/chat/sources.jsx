import "./sources.css";

const Sources = ({
  sources = [],
}) => {
  if (!sources.length) {
    return null;
  }

  return (
    <section
      className="sources"
      aria-label="Sources"
    >
      <div className="sources-header">
        <h3>Sources</h3>

        <span>
          {sources.length}
        </span>
      </div>

      <div className="sources-grid">
        {sources.map(
          (source, index) => (
            <a
              key={`${source.url}-${index}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="source-card"
            >
              <span className="source-number">
                {index + 1}
              </span>

              <div className="source-content">
                <strong>
                  {source.title}
                </strong>

                <span>
                  {source.domain}
                </span>
              </div>
            </a>
          )
        )}
      </div>
    </section>
  );
};

export default Sources;
