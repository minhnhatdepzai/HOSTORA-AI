type StructuredDataValue = Record<string, unknown> | Record<string, unknown>[];

export function StructuredData({ data }: { data: StructuredDataValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
