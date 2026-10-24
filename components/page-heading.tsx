export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-10 max-w-3xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
        {description}
      </p>
    </div>
  );
}
