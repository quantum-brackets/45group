import Link from "next/link";
import SectionWrapper from "~/components/home/section-wrapper";

const tel = "+234 8174683545";
const email = "info@45group.org";

export default function Contact() {
  return (
    <SectionWrapper
      id="contact"
      title="Contact"
      subtitle="For comprehensive support and assistance with your travel needs, please don't hesitate to contact the dedicated team at 45Group, who can expertly help you with booking comfortable lodges for your stay, guide you through the process of attending local events and attractions, or assist in making reservations at the finest restaurants in the area to enhance your dining experience."
    >
      <main className="mx-auto flex w-[450px] justify-between gap-8 largeMobile:!w-full largeMobile:flex-col tablet_768:w-[90%]">
        <div className="flex flex-col items-center">
          <h6 className="text-xs font-black largeLaptop:text-sm">Email</h6>
          <Link href={"mailto:" + email} className="hover:underline">
            <small className="largeLaptop:text-sm">{email}</small>
          </Link>
        </div>
        <div className="flex flex-col items-center">
          <h6 className="text-xs font-black largeLaptop:text-sm">Phone</h6>
          <Link href={"tel:" + tel} className="hover:underline">
            <small className="largeLaptop:text-sm">{tel}</small>
          </Link>
        </div>
      </main>
    </SectionWrapper>
  );
}
