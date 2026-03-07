import Link from "next/link";

interface ArchiveItem {
  label: string;
  count: number;
  year: number;
  month: number;
}

interface ArchiveWidgetProps {
  archives: ArchiveItem[];
}

export function ArchiveWidget({ archives }: ArchiveWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
      <h3 className="font-heading font-bold text-sm text-[#4A3728] mb-3">글 보관함</h3>
      <ul className="space-y-1">
        {archives.map((item) => (
          <li key={item.label}>
            <Link
              href={`/blog?year=${item.year}&month=${item.month}`}
              className="text-[0.82rem] text-[#555555] hover:text-[#607D8B] transition-colors flex justify-between"
            >
              <span>{item.label}</span>
              <span className="text-[#999999]">({item.count})</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
