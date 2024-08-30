export default function About() {
  return (
    <div className="flex max-w-[800px] flex-col items-center gap-8 p-12 largeMobile:gap-6 largeMobile:p-8 largeMobile:px-4">
      <h1 className="text-center text-2xl uppercase largeMobile:text-lg">WHERE THE HEART IS</h1>
      <main className="flex flex-col gap-9">
        <div className="flex flex-col gap-6 largeMobile:gap-4">
          <p className="text-center text-sm leading-7 largeMobile:text-xs largeMobile:leading-6">
            {
              "We're a quaint and dainty boutique hotel with 10 rooms and a pent, with a rooftop bar. Peek in the unique inn and feel the exclusive luxury of our executive and deluxe rooms, business suites and exquisite Penthouse."
            }
          </p>
          <p className="text-center text-sm leading-7 largeMobile:text-xs largeMobile:leading-6">
            {
              "Located at the right angle of 45th street, 3 minutes drive to major main roads and only 10 away from the Marina, in State Housing Suburb, hub and heart of Calabar. Nestle in the restful landscape and escape to a little ecstasy and fantasy."
            }
          </p>
          <p className="text-center text-sm leading-7 largeMobile:text-xs largeMobile:leading-6">
            {
              "Bar 90°! Our rooftop bar with superb music and signature drinks! 50% off signatures on Karaoke Friday and 1 free signature with a meal order for Ladies' Saturday's. Restaurant 45, from street food to delicacies and tasty takeaways, our glorious food is a fusion of ethnic and exotic cuisine. Deliveries coming soon."
            }
          </p>
          <p className="text-center text-sm leading-7 largeMobile:text-xs largeMobile:leading-6">
            {
              "Your choice, restaurant and bar open 24h! Business, leisure or pleasure? Seminars, conferences, bachelor’s eves, wedding receptions, or birthday parties in our hall complete with projector and surround sound, customised seating and catering. With us, it's personal. It's home sweet home, it's home away from home... It's where the heart is"
            }
          </p>
        </div>
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-lg capitalize largeMobile:text-base">The Team</h2>
          <div className="flex w-full flex-wrap items-center justify-evenly gap-8">
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Catherine Anani</h4>
              <small className="text-xs largeMobile:text-[10px]">General Manager</small>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Catherine Anani</h4>
              <small className="text-xs largeMobile:text-[10px]">General Manager</small>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Catherine Anani</h4>
              <small className="text-xs largeMobile:text-[10px]">General Manager</small>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
