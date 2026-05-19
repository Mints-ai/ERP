// Reusable Framer Motion Variants for Modern Blue Glassmorphism UI

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } 
  },
};

export const staggerContainer = {
  hidden: {},
  visible: { 
    transition: { staggerChildren: 0.04 } 
  },
};

export const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.99 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { duration: 0.2, ease: "easeOut" } 
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { duration: 0.25, ease: "easeOut" } 
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.2, ease: "easeOut" } 
  },
};

export const pageVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: 0.2, staggerChildren: 0.06 } 
  },
};
