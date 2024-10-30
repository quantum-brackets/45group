const data = [
  "Welcome to 45 Group, where hospitality isn’t just a service—it's a heartfelt experience. Guided by our motto, “Where the heart is,” we’ve cultivated a diverse range of hospitality businesses that embody warmth, luxury, and personalized care.",
  "From cozy boutique hotels to lively bars, elegant lounges, exclusive clubs, and versatile event centers, each of our establishments is designed to create memorable experiences that resonate with the heart and soul. Our venues are not just places to visit; they are destinations where moments are cherished, and stories are made.",
  "Hotels: Our boutique hotels are a serene escape from the bustle of everyday life. Nestled in prime locations, each hotel offers a unique blend of comfort, luxury, and a touch of home. Whether you’re here for business, leisure, or a special occasion, our suites, penthouses, and rooms are tailored to provide an unparalleled stay that feels like home—away from home.",
  "Restaurants: Indulge in a culinary journey at our restaurants, where ethnic and exotic flavors come together in perfect harmony. From street food-inspired dishes to gourmet delicacies, our menu caters to every palate, ensuring that every meal is a feast for the senses. Our 24-hour service ensures that you can satisfy your cravings anytime, day or night.",
  "Event Centers: Celebrate life’s milestones with us. Our event centers are equipped with state-of-the-art facilities, offering the perfect setting for weddings, conferences, parties, and more. With customizable seating, top-notch catering, and a dedicated team to bring your vision to life, your event is in good hands.",
  "Club Lounges: Sip, savor, and socialize in style at our sophisticated bars and lounges. Whether you’re unwinding after a long day, enjoying live music, or celebrating with friends, our signature drinks and vibrant atmospheres make every visit special. Don’t miss our themed nights and exclusive offers that turn ordinary evenings into extraordinary memories.",
  "At 45 Group, we believe that every guest deserves a place that feels like home. With us, it’s personal. It’s comfortable. It’s unforgettable.",
  "Welcome to 45 Group — Where the heart is.",
];

export default function About() {
  return (
    <div className="flex max-w-[800px] flex-col items-center gap-8 p-12 largeMobile:gap-6 largeMobile:p-8 largeMobile:px-4">
      <h1 className="text-center text-2xl uppercase largeMobile:text-lg">WHERE THE HEART IS</h1>
      <main className="flex flex-col gap-9">
        <div className="flex flex-col gap-6 largeMobile:gap-4">
          {data.map((text, index) => (
            <p
              className="text-center text-sm leading-7 largeMobile:text-xs largeMobile:leading-6"
              key={index}
            >
              {text}
            </p>
          ))}
        </div>
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-lg capitalize largeMobile:text-base">The Team</h2>
          <div className="flex w-full flex-wrap items-center justify-evenly gap-8">
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Precious Ogbizi</h4>
              <small className="text-xs largeMobile:text-[10px]">Managing Director</small>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Catherine Ogbizi</h4>
              <small className="text-xs largeMobile:text-[10px]">Executive Director</small>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h4 className="text-sm largeMobile:text-xs">Emmanuel Ogbizi</h4>
              <small className="text-xs largeMobile:text-[10px]">ICT Director</small>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
