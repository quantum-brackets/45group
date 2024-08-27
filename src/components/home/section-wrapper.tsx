import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function SectionWrapper({ title, children, subtitle }: Props) {
  return (
    <section className="flex flex-col gap-8 px-12 largeMobile:gap-6 tablet_768:!px-4 tablet:px-6 largeLaptop:px-16">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl largeMobile:!text-base tablet:text-xl">
          {title} ~{" "}
          <span className="text-base largeMobile:!text-xs tablet:text-sm">{subtitle}</span>
        </h1>
      </header>
      {children}
    </section>
  );
}
