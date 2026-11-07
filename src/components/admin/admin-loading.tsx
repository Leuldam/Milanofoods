import React from "react";

export function AdminTableLoading({
  colSpan,
  label,
}: {
  colSpan: number;
  label: string;
}) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: "20px 16px" }}>
        <div className="admin-table-loading" role="status" aria-label={label}>
          <span className="admin-loading-label">{label}</span>
          {[0, 1, 2].map((row) => (
            <div className="admin-loading-table-row" key={row} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      </td>
    </tr>
  );
}

export function AdminPageLoading({ label }: { label: string }) {
  return (
    <div className="admin-page-loading" role="status" aria-label={label}>
      <div className="admin-loading-heading">
        <span className="admin-loading-block admin-loading-title" />
        <span className="admin-loading-block admin-loading-description" />
      </div>
      <div className="admin-loading-metrics" aria-hidden="true">
        {[0, 1, 2, 3].map((card) => (
          <div className="admin-loading-metric" key={card}>
            <span className="admin-loading-block admin-loading-metric-label" />
            <span className="admin-loading-block admin-loading-metric-value" />
            <span className="admin-loading-block admin-loading-metric-note" />
          </div>
        ))}
      </div>
      <div className="admin-loading-section" aria-hidden="true">
        <span className="admin-loading-block admin-loading-section-title" />
        {[0, 1, 2, 3].map((row) => (
          <span className="admin-loading-block admin-loading-section-row" key={row} />
        ))}
      </div>
      <span className="admin-loading-label">{label}</span>
    </div>
  );
}
