import { Project } from '@/types/common';

export const projects: Project[] = [
  {
    id: '1',
    slug: 'ai-powered-analytics-dashboard',
    title: 'AI-Powered Analytics Dashboard',
    description: 'A comprehensive analytics platform that leverages machine learning to provide actionable insights and predictive analytics for business intelligence.',
    category: 'website',
    thumbnail: '/images/portfolio/ai-dashboard-thumb.jpg',
    images: [
      '/images/portfolio/ai-dashboard-1.jpg',
      '/images/portfolio/ai-dashboard-2.jpg',
      '/images/portfolio/ai-dashboard-3.jpg'
    ],
    techStack: ['React', 'TypeScript', 'Next.js', 'TensorFlow.js', 'D3.js', 'Node.js'],
    client: 'TechCorp Solutions',
    duration: '6 months',
    highlights: [
      'Real-time data processing with WebSockets',
      'Custom ML models for anomaly detection',
      'Interactive data visualization with D3.js',
      'Role-based access control system'
    ],
    testimonial: {
      author: 'CTO, TechCorp Solutions',
      content: 'The AI-powered dashboard transformed how we make business decisions. The predictive insights have increased our operational efficiency by 40%.',
    },
    links: {
      live: 'https://demo.example.com/ai-dashboard',
      github: 'https://github.com/example/ai-dashboard'
    }
  },
  {
    id: '2',
    slug: 'mobile-ecommerce-platform',
    title: 'Mobile E-commerce Platform',
    description: 'A fully responsive e-commerce platform optimized for mobile devices with seamless payment integration and personalized shopping experience.',
    category: 'app',
    thumbnail: '/images/portfolio/ecommerce-thumb.jpg',
    images: [
      '/images/portfolio/ecommerce-1.jpg',
      '/images/portfolio/ecommerce-2.jpg',
      '/images/portfolio/ecommerce-3.jpg'
    ],
    techStack: ['React Native', 'Firebase', 'Stripe', 'Redux', 'GraphQL'],
    client: 'ShopEasy Inc.',
    duration: '4 months',
    highlights: [
      'Offline-first mobile application',
      'Secure payment processing with Stripe',
      'Push notifications for order updates',
      'Personalized product recommendations'
    ],
    testimonial: {
      author: 'Product Manager, ShopEasy Inc.',
      content: 'Our mobile sales increased by 65% after launching this platform. The user experience is exceptional across all devices.',
    },
    links: {
      live: 'https://demo.example.com/ecommerce',
      github: 'https://github.com/example/ecommerce-platform'
    }
  },
  {
    id: '3',
    slug: 'blockchain-supply-chain',
    title: 'Blockchain Supply Chain Tracker',
    description: 'A decentralized supply chain management system using blockchain technology to ensure transparency, traceability, and security.',
    category: 'website',
    thumbnail: '/images/portfolio/blockchain-thumb.jpg',
    images: [
      '/images/portfolio/blockchain-1.jpg',
      '/images/portfolio/blockchain-2.jpg',
      '/images/portfolio/blockchain-3.jpg'
    ],
    techStack: ['Solidity', 'Ethereum', 'React', 'IPFS', 'Web3.js', 'Node.js'],
    client: 'Global Logistics Partners',
    duration: '8 months',
    highlights: [
      'Smart contract implementation for automated workflows',
      'Immutable audit trail for product tracking',
      'Integration with IoT sensors for real-time monitoring',
      'Multi-signature wallet for secure transactions'
    ],
    testimonial: {
      author: 'Operations Director, Global Logistics Partners',
      content: 'This blockchain solution has eliminated fraud in our supply chain and reduced verification time by 80%. It\'s a game-changer for our industry.',
    },
    links: {
      live: 'https://demo.example.com/blockchain-tracker',
      github: 'https://github.com/example/blockchain-supply-chain'
    }
  },
  {
    id: '4',
    slug: 'healthcare-telemedicine-app',
    title: 'Healthcare Telemedicine Application',
    description: 'A HIPAA-compliant telemedicine platform connecting patients with healthcare providers through secure video consultations and medical record management.',
    category: 'app',
    thumbnail: '/images/portfolio/telemedicine-thumb.jpg',
    images: [
      '/images/portfolio/telemedicine-1.jpg',
      '/images/portfolio/telemedicine-2.jpg',
      '/images/portfolio/telemedicine-3.jpg'
    ],
    techStack: ['React', 'WebRTC', 'AWS', 'MongoDB', 'OAuth 2.0', 'HIPAA Compliance'],
    client: 'MediConnect Health',
    duration: '10 months',
    highlights: [
      'End-to-end encrypted video consultations',
      'Electronic health record integration',
      'Appointment scheduling and reminders',
      'Prescription management system'
    ],
    testimonial: {
      author: 'Medical Director, MediConnect Health',
      content: 'During the pandemic, this platform enabled us to continue providing critical healthcare services remotely while maintaining patient privacy and compliance.',
    },
    links: {
      live: 'https://demo.example.com/telemedicine',
      github: 'https://github.com/example/telemedicine-app'
    }
  },
  {
    id: '5',
    slug: 'smart-home-automation',
    title: 'Smart Home Automation System',
    description: 'An IoT-powered home automation platform that integrates various smart devices and provides intelligent automation based on user behavior and preferences.',
    category: 'ai',
    thumbnail: '/images/portfolio/smarthome-thumb.jpg',
    images: [
      '/images/portfolio/smarthome-1.jpg',
      '/images/portfolio/smarthome-2.jpg',
      '/images/portfolio/smarthome-3.jpg'
    ],
    techStack: ['React', 'MQTT', 'Raspberry Pi', 'Python', 'AWS IoT', 'WebSocket'],
    client: 'HomeTech Innovations',
    duration: '5 months',
    highlights: [
      'Cross-platform mobile and web interface',
      'Machine learning for behavior prediction',
      'Energy consumption optimization',
      'Voice assistant integration'
    ],
    testimonial: {
      author: 'CEO, HomeTech Innovations',
      content: 'The smart home system has reduced our clients\' energy bills by 30% while providing unprecedented convenience and security.',
    },
    links: {
      live: 'https://demo.example.com/smarthome',
      github: 'https://github.com/example/smarthome-automation'
    }
  },
  {
    id: '6',
    slug: 'fintech-investment-platform',
    title: 'Fintech Investment Platform',
    description: 'A sophisticated investment platform offering robo-advisory services, portfolio management, and real-time market analysis for retail investors.',
    category: 'website',
    thumbnail: '/images/portfolio/fintech-thumb.jpg',
    images: [
      '/images/portfolio/fintech-1.jpg',
      '/images/portfolio/fintech-2.jpg',
      '/images/portfolio/fintech-3.jpg'
    ],
    techStack: ['Next.js', 'TypeScript', 'Chart.js', 'Redis', 'PostgreSQL', 'Docker'],
    client: 'WealthWise Financial',
    duration: '7 months',
    highlights: [
      'Algorithmic portfolio rebalancing',
      'Risk assessment and profiling',
      'Real-time market data integration',
      'Tax-loss harvesting optimization'
    ],
    testimonial: {
      author: 'Investment Advisor, WealthWise Financial',
      content: 'Our platform has helped over 10,000 users achieve their financial goals with personalized investment strategies and professional-grade tools.',
    },
    links: {
      live: 'https://demo.example.com/fintech-platform',
      github: 'https://github.com/example/fintech-investment'
    }
  },
  {
    id: '7',
    slug: 'educational-learning-platform',
    title: 'Educational Learning Platform',
    description: 'An interactive online learning platform with adaptive learning paths, progress tracking, and collaborative features for students and educators.',
    category: 'website',
    thumbnail: '/images/portfolio/education-thumb.jpg',
    images: [
      '/images/portfolio/education-1.jpg',
      '/images/portfolio/education-2.jpg',
      '/images/portfolio/education-3.jpg'
    ],
    techStack: ['Vue.js', 'Laravel', 'MySQL', 'Redis', 'WebSockets', 'SCORM'],
    client: 'EduTech Global',
    duration: '9 months',
    highlights: [
      'Adaptive learning algorithms',
      'Gamification and achievement system',
      'Video conferencing integration',
      'Comprehensive analytics dashboard'
    ],
    testimonial: {
      author: 'Education Director, EduTech Global',
      content: 'Student engagement increased by 75% and completion rates improved by 45% after implementing this platform across our institution.',
    },
    links: {
      live: 'https://demo.example.com/learning-platform',
      github: 'https://github.com/example/educational-platform'
    }
  },
  {
    id: '8',
    slug: 'sustainable-energy-monitoring',
    title: 'Sustainable Energy Monitoring',
    description: 'A renewable energy monitoring and optimization platform for solar installations, providing real-time performance analytics and maintenance alerts.',
    category: 'ai',
    thumbnail: '/images/portfolio/energy-thumb.jpg',
    images: [
      '/images/portfolio/energy-1.jpg',
      '/images/portfolio/energy-2.jpg',
      '/images/portfolio/energy-3.jpg'
    ],
    techStack: ['Angular', 'Node.js', 'InfluxDB', 'Grafana', 'MQTT', 'AWS'],
    client: 'GreenPower Solutions',
    duration: '6 months',
    highlights: [
      'Real-time energy production monitoring',
      'Predictive maintenance alerts',
      'Carbon footprint calculation',
      'Grid integration optimization'
    ],
    testimonial: {
      author: 'CTO, GreenPower Solutions',
      content: 'This platform has helped our clients maximize their solar energy output by 25% and reduce maintenance costs through proactive issue detection.',
    },
    links: {
      live: 'https://demo.example.com/energy-monitoring',
      github: 'https://github.com/example/energy-monitoring'
    }
  }
];

export const getProjects = (): Project[] => {
  return projects;
};

export const getProjectBySlug = (slug: string): Project | undefined => {
  return projects.find(project => project.slug === slug);
};

export const getProjectsByCategory = (category: string): Project[] => {
  return projects.filter(project => project.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(projects.map(project => project.category))].sort();
};