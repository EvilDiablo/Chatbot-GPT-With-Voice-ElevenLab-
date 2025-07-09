export const scrollToElement = (elementRef: React.RefObject<HTMLElement>) => {
  if (elementRef.current) {
    elementRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start", // Align to the top of the viewport
    });
  }
};


