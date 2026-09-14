'use client';

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden="true" className={`loading-skeleton ${className}`} style={style} />;
}

export function DashboardSkeleton() {
  return (
    <div className="loading-dashboard-skeleton" role="status" aria-label="Loading dashboard">
      <div className="loading-skeleton-header">
        <Skeleton style={{ width: 'min(320px, 55%)', height: '30px' }} />
        <Skeleton style={{ width: '150px', height: '42px', borderRadius: '10px' }} />
      </div>
      <div className="loading-skeleton-stats">
        {[1, 2, 3].map((item) => (
          <div className="loading-skeleton-panel" key={item}>
            <Skeleton style={{ width: '42%', height: '14px' }} />
            <Skeleton style={{ width: '34%', height: '34px', marginTop: '18px' }} />
            <Skeleton style={{ width: '58%', height: '12px', marginTop: '14px' }} />
          </div>
        ))}
      </div>
      <div className="loading-skeleton-columns">
        {[1, 2].map((column) => (
          <div className="loading-skeleton-panel" key={column}>
            <Skeleton style={{ width: '48%', height: '20px' }} />
            {[1, 2, 3, 4].map((row) => <Skeleton key={row} style={{ width: `${78 - row * 8}%`, height: '38px', marginTop: '16px' }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CollectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="loading-collection-skeleton" role="status" aria-label="Loading content">
      <Skeleton style={{ width: '220px', height: '22px' }} />
      {Array.from({ length: rows }, (_, index) => (
        <div className="loading-skeleton-row" key={index}>
          <Skeleton style={{ width: '42px', height: '42px', borderRadius: '8px' }} />
          <div style={{ flex: 1 }}>
            <Skeleton style={{ width: `${48 + (index % 3) * 12}%`, height: '15px' }} />
            <Skeleton style={{ width: `${34 + (index % 2) * 18}%`, height: '12px', marginTop: '9px' }} />
          </div>
          <Skeleton style={{ width: '72px', height: '28px', borderRadius: '8px' }} />
        </div>
      ))}
    </div>
  );
}
