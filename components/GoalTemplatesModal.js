// components/GoalTemplatesModal.js - Desktop layout fix only
import { useState } from 'react';
import { X, Target, Clock, TrendingUp, User, Briefcase, Heart, BookOpen, Zap, ChevronDown, ChevronUp } from 'lucide-react';

export default function GoalTemplatesModal({ isOpen, onClose, onSelectTemplate }) {
  const [selectedCategory, setSelectedCategory] = useState('fitness');
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'fitness', name: 'Health & Fitness', icon: Heart, color: 'text-red-400' },
    { id: 'career', name: 'Career & Business', icon: Briefcase, color: 'text-blue-400' },
    { id: 'learning', name: 'Learning & Skills', icon: BookOpen, color: 'text-green-400' },
    { id: 'productivity', name: 'Productivity', icon: Zap, color: 'text-yellow-400' },
    { id: 'personal', name: 'Personal Growth', icon: User, color: 'text-purple-400' },
  ];

  const templates = {
    fitness: [
      {
        id: 'weight-loss',
        title: 'Weight Loss Journey',
        description: 'Lose weight sustainably through diet and exercise',
        duration: '12 weeks',
        difficulty: 'Beginner',
        framework: {
          overview: 'A balanced approach combining nutrition awareness and regular exercise for sustainable weight loss.',
          milestones: [
            'Week 2: Establish daily meal logging habit',
            'Week 4: Complete 12 workout sessions',
            'Week 6: Lose 5-8 pounds',
            'Week 8: Build consistent sleep schedule',
            'Week 12: Reach target weight and maintain for 2 weeks'
          ],
          kpis: [
            'Weekly weight measurement',
            'Daily calorie intake',
            'Weekly workout sessions completed',
            'Daily steps count',
            'Hours of sleep per night'
          ],
          firstSteps: [
            'Set your realistic target weight',
            'Download a meal tracking app',
            'Schedule 3 workout days this week'
          ]
        }
      },
      {
        id: 'marathon-training',
        title: 'Marathon Training',
        description: 'Train for your first marathon with a structured plan',
        duration: '16 weeks',
        difficulty: 'Advanced',
        framework: {
          overview: 'Progressive training program building endurance and strength for marathon completion.',
          milestones: [
            'Week 4: Complete first 10K run',
            'Week 8: Run half marathon distance',
            'Week 12: Complete 20-mile long run',
            'Week 16: Finish marathon'
          ],
          kpis: [
            'Weekly mileage total',
            'Long run distance progression',
            'Average pace improvement',
            'Training consistency rate'
          ],
          firstSteps: [
            'Assess current running fitness level',
            'Get proper running shoes fitted',
            'Plan your training schedule'
          ]
        }
      },
      {
        id: 'strength-building',
        title: 'Strength Building',
        description: 'Build muscle and strength through progressive training',
        duration: '8 weeks',
        difficulty: 'Intermediate',
        framework: {
          overview: 'Systematic strength training focused on compound movements and progressive overload.',
          milestones: [
            'Week 2: Master proper form for all exercises',
            'Week 4: Increase weights by 10%',
            'Week 6: Complete first unassisted pull-up',
            'Week 8: Achieve strength goals in major lifts'
          ],
          kpis: [
            'Weight lifted per exercise',
            'Number of reps completed',
            'Weekly training sessions',
            'Body measurements'
          ],
          firstSteps: [
            'Learn proper squat, deadlift, and bench press form',
            'Establish baseline strength measurements',
            'Create consistent workout schedule'
          ]
        }
      }
    ],
    career: [
      {
        id: 'skill-development',
        title: 'Professional Skill Development',
        description: 'Master a new skill to advance your career',
        duration: '6 months',
        difficulty: 'Intermediate',
        framework: {
          overview: 'Structured approach to learning and applying new professional skills with measurable outcomes.',
          milestones: [
            'Month 1: Complete foundational learning',
            'Month 2: Apply skills in practice project',
            'Month 3: Receive feedback and iterate',
            'Month 4: Complete advanced concepts',
            'Month 6: Demonstrate proficiency in real project'
          ],
          kpis: [
            'Hours of focused learning per week',
            'Practice projects completed',
            'Skill assessment scores',
            'Real-world applications'
          ],
          firstSteps: [
            'Identify specific skill to develop',
            'Find quality learning resources',
            'Set daily practice schedule'
          ]
        }
      },
      {
        id: 'promotion-track',
        title: 'Promotion Preparation',
        description: 'Position yourself for your next career advancement',
        duration: '9 months',
        difficulty: 'Advanced',
        framework: {
          overview: 'Strategic career advancement plan focusing on visibility, skills, and relationship building.',
          milestones: [
            'Month 3: Complete leadership training',
            'Month 6: Lead successful project',
            'Month 9: Receive promotion or advancement'
          ],
          kpis: [
            'New skills acquired',
            'Projects led successfully',
            'Positive feedback received',
            'Network connections made'
          ],
          firstSteps: [
            'Schedule career discussion with manager',
            'Identify required skills for next level',
            'Volunteer for high-visibility project'
          ]
        }
      },
      {
        id: 'side-business',
        title: 'Launch Side Business',
        description: 'Start and validate a profitable side business',
        duration: '4 months',
        difficulty: 'Advanced',
        framework: {
          overview: 'Lean startup approach to launching and validating a side business idea.',
          milestones: [
            'Month 1: Validate business idea',
            'Month 2: Create minimum viable product',
            'Month 3: Acquire first 10 customers',
            'Month 4: Achieve break-even point'
          ],
          kpis: [
            'Weekly revenue',
            'Customer acquisition cost',
            'Customer feedback scores',
            'Time invested per week'
          ],
          firstSteps: [
            'Identify problem you can solve',
            'Research target market',
            'Create basic business plan'
          ]
        }
      }
    ],
    learning: [
      {
        id: 'language-mastery',
        title: 'Language Learning',
        description: 'Achieve conversational fluency in a new language',
        duration: '6 months',
        difficulty: 'Intermediate',
        framework: {
          overview: 'Immersive language learning combining structured study with practical application.',
          milestones: [
            'Month 1: Master basic vocabulary (500 words)',
            'Month 2: Hold 5-minute conversation',
            'Month 3: Read simple texts fluently',
            'Month 6: Pass conversational fluency test'
          ],
          kpis: [
            'Daily study streak',
            'New words learned per week',
            'Conversation practice sessions',
            'Comprehension test scores'
          ],
          firstSteps: [
            'Choose your target language',
            'Download language learning app',
            'Schedule daily 30-minute study sessions'
          ]
        }
      },
      {
        id: 'coding-skills',
        title: 'Learn Programming',
        description: 'Master programming fundamentals and build projects',
        duration: '4 months',
        difficulty: 'Beginner',
        framework: {
          overview: 'Hands-on programming learning with real projects and portfolio development.',
          milestones: [
            'Month 1: Complete basic syntax course',
            'Month 2: Build first functional project',
            'Month 3: Learn frameworks and tools',
            'Month 4: Complete portfolio project'
          ],
          kpis: [
            'Daily coding hours',
            'Projects completed',
            'GitHub commits per week',
            'Technical challenges solved'
          ],
          firstSteps: [
            'Choose programming language',
            'Set up development environment',
            'Start with basic tutorial'
          ]
        }
      }
    ],
    productivity: [
      {
        id: 'time-management',
        title: 'Master Time Management',
        description: 'Optimize your daily schedule and eliminate time waste',
        duration: '4 weeks',
        difficulty: 'Beginner',
        framework: {
          overview: 'Systematic approach to time awareness and productive habit formation.',
          milestones: [
            'Week 1: Track current time usage',
            'Week 2: Implement time-blocking system',
            'Week 3: Eliminate top 3 time wasters',
            'Week 4: Achieve 80% schedule adherence'
          ],
          kpis: [
            'Hours of focused work per day',
            'Schedule adherence percentage',
            'Time wasters eliminated',
            'Daily task completion rate'
          ],
          firstSteps: [
            'Track your time for 3 days',
            'Identify your peak energy hours',
            'Choose time-blocking method'
          ]
        }
      },
      {
        id: 'deep-work',
        title: 'Develop Deep Work Habit',
        description: 'Build ability to focus intensely on cognitively demanding tasks',
        duration: '6 weeks',
        difficulty: 'Intermediate',
        framework: {
          overview: 'Progressive training to build sustained focus and eliminate distractions.',
          milestones: [
            'Week 2: Achieve 30-minute focus sessions',
            'Week 4: Complete 90-minute deep work blocks',
            'Week 6: Maintain 3 hours daily deep work'
          ],
          kpis: [
            'Daily deep work hours',
            'Distraction incidents per session',
            'Quality of work output',
            'Consistency streak'
          ],
          firstSteps: [
            'Identify your most important work',
            'Create distraction-free environment',
            'Start with 25-minute focus sessions'
          ]
        }
      }
    ],
    personal: [
      {
        id: 'morning-routine',
        title: 'Perfect Morning Routine',
        description: 'Create an energizing morning routine that sets up your day',
        duration: '3 weeks',
        difficulty: 'Beginner',
        framework: {
          overview: 'Build a consistent morning routine that boosts energy and sets positive momentum.',
          milestones: [
            'Week 1: Wake up at same time daily',
            'Week 2: Add exercise and mindfulness',
            'Week 3: Complete full routine 6/7 days'
          ],
          kpis: [
            'Routine completion rate',
            'Wake-up time consistency',
            'Energy level (1-10 rating)',
            'Day productivity rating'
          ],
          firstSteps: [
            'Set consistent wake-up time',
            'Plan your ideal morning sequence',
            'Prepare everything the night before'
          ]
        }
      },
      {
        id: 'mindfulness-practice',
        title: 'Build Mindfulness Practice',
        description: 'Develop daily meditation and mindfulness habits',
        duration: '8 weeks',
        difficulty: 'Beginner',
        framework: {
          overview: 'Progressive mindfulness training to reduce stress and increase present-moment awareness.',
          milestones: [
            'Week 2: Meditate 5 minutes daily',
            'Week 4: Complete 10-minute sessions',
            'Week 6: Practice mindful activities',
            'Week 8: Maintain 20-minute daily practice'
          ],
          kpis: [
            'Daily meditation streak',
            'Session duration',
            'Stress level (1-10 rating)',
            'Mindful moments throughout day'
          ],
          firstSteps: [
            'Download meditation app',
            'Set daily meditation time',
            'Start with 2-minute sessions'
          ]
        }
      }
    ]
  };

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  const currentTemplates = templates[selectedCategory] || [];

  const toggleTemplateExpansion = (templateId) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D1B2A] border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Goal Templates</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile: Horizontal Category Tabs */}
        <div className="lg:hidden border-b border-gray-700">
          <div className="flex overflow-x-auto scrollbar-hide">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setExpandedTemplate(null);
                  }}
                  className={`flex-shrink-0 flex flex-col items-center space-y-1 px-4 py-3 transition-colors ${
                    selectedCategory === category.id
                      ? 'text-[#00CFFF] border-b-2 border-[#00CFFF]'
                      : 'text-gray-400'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 ${
                    selectedCategory === category.id ? 'text-[#00CFFF]' : category.color
                  }`} />
                  <span className="text-xs font-medium whitespace-nowrap">{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area - FIXED: Added proper flex sizing for desktop */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          
          {/* Desktop: Left Sidebar - Categories - FIXED: Added flex-shrink-0 */}
          <div className="hidden lg:flex lg:flex-shrink-0 lg:w-64 border-r border-gray-700">
            <div className="w-full p-4">
              <div className="space-y-2">
                {categories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setExpandedTemplate(null);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                        selectedCategory === category.id
                          ? 'bg-[#00CFFF]/20 text-[#00CFFF]'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${
                        selectedCategory === category.id ? 'text-[#00CFFF]' : category.color
                      }`} />
                      <span className="font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Templates List - FIXED: Added proper flex-1 and min-w-0 */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="space-y-4">
                {currentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-700 rounded-xl overflow-hidden"
                  >
                    {/* Template Header - Always Visible */}
                    <div 
                      className="p-4 lg:p-6 cursor-pointer hover:bg-gray-800/30 transition-colors"
                      onClick={() => toggleTemplateExpansion(template.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {template.title}
                          </h4>
                          <p className="text-gray-400 text-sm mb-3">
                            {template.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-500">{template.duration}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-500">{template.difficulty}</span>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          {expandedTemplate === template.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Template Details */}
                    {expandedTemplate === template.id && (
                      <div className="border-t border-gray-700 p-4 lg:p-6 bg-gray-800/20">
                        <div className="space-y-6">
                          {/* Overview */}
                          <div>
                            <h5 className="text-white font-medium mb-2">Overview</h5>
                            <p className="text-gray-300 text-sm leading-relaxed">
                              {template.framework.overview}
                            </p>
                          </div>

                          {/* Milestones */}
                          <div>
                            <h5 className="text-white font-medium mb-3">Key Milestones</h5>
                            <div className="space-y-2">
                              {template.framework.milestones.map((milestone, index) => (
                                <div key={index} className="flex items-start space-x-2">
                                  <Target className="w-3 h-3 text-[#00CFFF] mt-1 flex-shrink-0" />
                                  <span className="text-gray-300 text-sm">{milestone}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Success Metrics */}
                          <div>
                            <h5 className="text-white font-medium mb-3">Success Metrics</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {template.framework.kpis.map((kpi, index) => (
                                <div key={index} className="text-gray-300 text-sm">
                                  • {kpi}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Use Template Button */}
                          <button
                            onClick={() => handleSelectTemplate(template)}
                            className="w-full bg-[#00CFFF] text-[#0D1B2A] py-3 px-4 rounded-lg font-semibold hover:bg-[#00CFFF]/90 transition-colors"
                          >
                            Use This Template
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
