export default function Booking({
  searchParams: { type, city },
}: {
  searchParams: {
    type: "rooms" | "events" | "dining";
    city: string;
    group: string;
    from: string;
    to: string;
  };
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <h1>
        Booking - <span className="capitalize">{type}</span> at{" "}
        <span className="capitalize">{city}</span>
      </h1>
    </div>
  );
}
