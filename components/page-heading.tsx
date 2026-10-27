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
    <div className="mb-7 max-w-3xl sm:mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-3xl leading-[1.14] font-extrabold tracking-[-.04em] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[#5d7078] sm:mt-4 sm:text-lg sm:leading-8">
        {description}
      </p>
    </div>
  );
}
