import React, { useRef } from "react";

const Header = () => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const handleScroll = () => {
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  return (
    <div className='w-full bg-transparent flex font-semibold flex-row justify-between py-5 text-lg'>
      <div>logo</div>
      <div className='flex flex-row space-x-12'>
        <div>Home</div>
        <div>About</div>
        <div>Project</div>
        <div>Contact</div>
      </div>
    </div>
  );
};

export default Header;
