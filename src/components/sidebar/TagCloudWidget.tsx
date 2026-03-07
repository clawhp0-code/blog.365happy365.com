import Link from "next/link";

interface TagItem {
  name: string;
  count: number;
  slug: string;
}

interface TagCloudWidgetProps {
  tags: TagItem[];
}

export function TagCloudWidget({ tags }: TagCloudWidgetProps) {
  return (
    <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-4">
      <h3 className="font-heading font-bold text-sm text-[#4A3728] mb-3">TAG</h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            href={`/tags/${encodeURIComponent(tag.slug)}`}
            className="inline-block px-2 py-0.5 text-[0.75rem] text-[#555555] bg-[#F8F5EE] rounded hover:bg-[#607D8B] hover:text-white transition-colors"
          >
            {tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
