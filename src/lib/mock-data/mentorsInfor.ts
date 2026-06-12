export const MENTORS = [
  {
    name: "Sarah Connor",
    role: "Sr. Frontend @ Google",
    expertise: ["React", "System Design", "UI/UX"],
    rating: 4.9,
    sessions: 124,
    image: "https://i.pravatar.cc/150?u=sarah",
    bio: "Passionate about building scalable, performant, and accessible web applications. With over 10 years of experience in the industry, I've led teams at Google and top startups. I specialize in React ecosystem, complex state management, and design systems.",
    languages: ["English", "Spanish"],
    education: "MS in Computer Science, Stanford University",
    availability: "Mon, Wed, Fri",
    packages: [
      { name: "Quick Consult", price: "50", duration: "1 hour", description: "Perfect for quick architecture reviews or specific bug fixes." },
      { name: "Technical Deep Dive", price: "90", duration: "2 hours", description: "Comprehensive review of your code, system design, or career roadmap." },
      { name: "Intensive Session", price: "135", duration: "3 hours", description: "Deep dive into your complex technical problems." }
    ]
  },
  {
    name: "David Miller",
    role: "Engineering Lead @ Netflix",
    expertise: ["Node.js", "Scale", "Backend"],
    rating: 5.0,
    sessions: 89,
    image: "https://i.pravatar.cc/150?u=david",
    bio: "Architecting high-traffic systems that serve millions. Expert in distributed systems, microservices, and Node.js performance tuning. I help engineers transition into senior and lead roles by focusing on technical leadership and scalability.",
    languages: ["English", "German"],
    education: "BS in Software Engineering, MIT",
    availability: "Tue, Thu",
    packages: [
      { name: "System Review", price: "120", duration: "1 hour", description: "Let's review your system's scalability and bottlenecks." },
      { name: "Architecture Planning", price: "230", duration: "2 hours", description: "Detailed planning for scaling out and microservices." },
      { name: "Leadership Coaching", price: "340", duration: "3 hours", description: "Intensive advice for aspiring team leads and tech scaling." }
    ]
  },
  {
    name: "Elena Rodriguez",
    role: "Staff Engineer @ Meta",
    expertise: ["Performance", "A11y", "Frontend"],
    rating: 4.8,
    sessions: 210,
    image: "https://i.pravatar.cc/150?u=elena",
    bio: "Championing web accessibility and performance at scale. I've been a core contributor to several open-source frameworks and currently lead performance initiatives at Meta. I love teaching deep technical concepts in an easy-to-understand way.",
    languages: ["English", "Portuguese", "Spanish"],
    education: "BFA in Design & Technology, Parsons",
    availability: "Weekends",
    packages: [
      { name: "Code Review", price: "100", duration: "1 hour", description: "Ensuring your app is fully compliant and user-friendly for everyone." },
      { name: "Performance Audit", price: "190", duration: "2 hours", description: "In-depth profiling of your web applications for maximum speed." },
      { name: "Masterclass", price: "270", duration: "3 hours", description: "Extensive pairing session focusing on A11y and Web Vitals." }
    ]
  },
  {
    name: "Mark Wilson",
    role: "CTO @ TechFlow",
    expertise: ["AWS", "Architecture", "Cloud"],
    rating: 4.7,
    sessions: 56,
    image: "https://i.pravatar.cc/150?u=mark",
    bio: "From first engineer to CTO of a multi-million dollar company. I have extensive experience in building cloud-native infrastructures and scaling technical organizations. I mentor founders and technical leads on strategy and execution.",
    languages: ["English"],
    education: "MBA, Harvard Business School",
    availability: "Flexible",
    packages: [
      { name: "Strategy Call", price: "180", duration: "1 hour", description: "CTO-level advice on tech stack selection and team scaling." },
      { name: "Cloud Planning", price: "350", duration: "2 hours", description: "Planning and optimizing your AWS/GCP/Azure infrastructure." },
      { name: "Startup Intensive", price: "500", duration: "3 hours", description: "Full audit of architecture, hiring plan and product tech scaling." }
    ]
  },
  {
    name: "Chen Wei",
    role: "Data Scientist @ Amazon",
    expertise: ["Machine Learning", "Python", "Data Science"],
    rating: 4.9,
    sessions: 153,
    image: "https://i.pravatar.cc/150?u=chen",
    bio: "Specializing in predictive modeling and NLP. I help mentees build robust ML pipelines and break into the data science industry.",
    languages: ["English", "Mandarin"],
    education: "PhD in Data Science, UC Berkeley",
    availability: "Weekends",
    packages: [
      { name: "Resume Review", price: "60", duration: "1 hour", description: "Tweak your resume for Data Science roles." },
      { name: "Mock Interview", price: "120", duration: "1.5 hours", description: "Full technical and behavioral data science interview." }
    ]
  },
  {
    name: "Lisa Ray",
    role: "UX Researcher @ Airbnb",
    expertise: ["User Research", "Figma", "UI/UX"],
    rating: 4.8,
    sessions: 92,
    image: "https://i.pravatar.cc/150?u=lisa",
    bio: "Creating human-centered experiences. Let's work on your portfolio, case studies, and design thinking process.",
    languages: ["English"],
    education: "BA in Interaction Design, RISD",
    availability: "Mon, Tue",
    packages: [
      { name: "Portfolio Review", price: "80", duration: "1 hour", description: "Detailed critique of your design portfolio." }
    ]
  },
  {
    name: "Đỗ Minh Quân",
    role: "Backend Engineer @ Stripe",
    expertise: ["Golang", "System Design", "Backend"],
    rating: 4.8,
    sessions: 78,
    image: "https://i.pravatar.cc/150?u=johndoe",
    bio: "Building robust payment APIs. I can help you master Go, understand distributed systems, and prepare for backend interviews.",
    languages: ["English"],
    education: "BS in Computer Science, Waterloo",
    availability: "Wed, Thu",
    packages: [
      { name: "System Design Prep", price: "110", duration: "1 hour", description: "Practice system design interviews with a focus on payments." }
    ]
  },
  {
    name: "Amanda Lee",
    role: "Product Manager @ Microsoft",
    expertise: ["Product Management", "Strategy", "Leadership"],
    rating: 4.9,
    sessions: 205,
    image: "https://i.pravatar.cc/150?u=amanda",
    bio: "Leading cross-functional teams to deliver impactful products. I guide aspiring PMs through the transition and interview process.",
    languages: ["English", "Korean"],
    education: "MBA, Wharton",
    availability: "Fri, Sat",
    packages: [
      { name: "PM Interview Prep", price: "150", duration: "1.5 hours", description: "Mock PM interview focusing on product sense and execution." }
    ]
  },
  {
    name: "Robert King",
    role: "DevOps Engineer @ SpaceX",
    expertise: ["Kubernetes", "CI/CD", "Cloud"],
    rating: 5.0,
    sessions: 42,
    image: "https://i.pravatar.cc/150?u=robert",
    bio: "Automating deployments and ensuring maximum reliability. Learn the best practices for containerization and infrastructure as code.",
    languages: ["English"],
    education: "BS in IT, UT Austin",
    availability: "Sun",
    packages: [
      { name: "Infrastructure Review", price: "90", duration: "1 hour", description: "Review and optimize your project's CI/CD pipeline." }
    ]
  },
  {
    name: "Maria Garcia",
    role: "Mobile Developer @ Apple",
    expertise: ["Swift", "iOS", "Mobile"],
    rating: 4.7,
    sessions: 110,
    image: "https://i.pravatar.cc/150?u=maria",
    bio: "Crafting beautiful iOS applications. Let's delve into Swift, SwiftUI, and mobile architecture patterns.",
    languages: ["English", "Spanish"],
    education: "BS in Software Engineering, UCLA",
    availability: "Varies",
    packages: [
      { name: "Code Pairing", price: "100", duration: "1 hour", description: "Together we'll build and refactor iOS app components." }
    ]
  }
];

export const RECRUITERS = [
  { name: "Alex Chen", company: "OpenAI", lookingFor: "Frontend Engineers", industry: "AI/ML", matches: 42 },
  { name: "Jessica Bloom", company: "Stripe", lookingFor: "Fullstack Developers", industry: "Fintech", matches: 15 },
];

export const COURSES = [
  { title: "Ultimate React & Next.js Masterclass", provider: "Udemy", price: "$12.99", originalPrice: "$89.99", discount: "85%", rating: 4.8, students: "12k+" },
  { title: "Advanced AWS Architecture for Frontend", provider: "Coursera", price: "Free", originalPrice: "$49.99", discount: "100%", rating: 4.9, students: "5k+" },
  { title: "System Design for Modern Web Apps", provider: "Pluralsight", price: "$29.00", originalPrice: "$59.00", discount: "50%", rating: 4.7, students: "8k+" },
];
