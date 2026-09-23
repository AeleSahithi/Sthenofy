import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Clock, User, Flame, Calendar } from 'lucide-react';

const blogPosts = [
  {
    title: '5 Compound Lifts That Build Full-Body Strength',
    category: 'Strength',
    excerpt: 'Master these five fundamental movements and watch your strength skyrocket. We break down form, progression, and common mistakes.',
    date: 'Sep 18, 2026',
    readTime: '8 min',
    author: 'Coach Marcus',
    img: 'https://images.pexels.com/photos/896058/pexels-photo-896058.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: true,
    body: [
      'When it comes to building real strength, the fundamentals never change. Too many people overcomplicate their training with endless variations and isolation exercises when what they really need is to master a handful of compound movements and progressively overload them over time.',
      'The five lifts every serious lifter should master: the squat, deadlift, bench press, overhead press, and barbell row. Each one hits multiple muscle groups simultaneously, triggering a hormonal response that isolation exercises simply cannot match.',
      'The key is consistency. Showing up week after week, adding weight to the bar, and trusting the process. It is not glamorous, but it works. Every single member who has transformed their body at STHENOFY has done it through simple, relentless consistency.',
      'Start light. Focus on form. Add weight slowly. These three rules will carry you further than any supplement, program, or gadget ever could. Your body responds to stress — give it the right stress consistently and it will adapt.',
      'At STHENOFY, our trainers build every program around these principles. Whether you are a complete beginner or an experienced lifter, the foundation remains the same. The only thing that changes is the weight on the bar.',
    ],
    quote: 'The best program is the one you actually follow. Consistency beats perfection every single time.',
  },
  {
    title: 'The Science of Recovery: Why Rest Days Matter',
    category: 'Recovery',
    excerpt: 'Muscle growth happens during recovery, not during the workout. Learn how to optimize your rest for maximum gains.',
    date: 'Sep 12, 2026',
    readTime: '6 min',
    author: 'Dr. Sarah Chen',
    img: 'https://images.pexels.com/photos/868483/pexels-photo-868483.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: false,
    body: [
      'When you lift weights, you create microscopic tears in your muscle fibers. The actual repair and growth process happens during rest — specifically during deep sleep and on your days off from the gym.',
      'Many people believe more is better, but training without adequate recovery leads to overtraining syndrome: decreased performance, elevated cortisol, poor sleep, and eventually injury. Your body can only rebuild if you give it the time and nutrients to do so.',
      'A good rule of thumb: take at least one full rest day per week, sleep 7-9 hours per night, and never train the same muscle group two days in a row. Active recovery — light walking, stretching, or yoga — is far better than complete sedentary rest.',
      'Nutrition matters too. Protein intake should be 0.8-1g per pound of body weight, and you need carbohydrates to replenish glycogen stores. Without sufficient fuel, your body will break down muscle rather than build it.',
      'At STHENOFY, we program recovery into every plan. Your rest days are not laziness — they are where the magic happens.',
    ],
    quote: 'Recovery is not the absence of training. It is the most important part of it.',
  },
  {
    title: 'HIIT vs Steady State Cardio: Which Burns More Fat?',
    category: 'Cardio',
    excerpt: 'The debate ends here. We analyze the research and give you a clear answer based on your fitness goals.',
    date: 'Sep 5, 2026',
    readTime: '7 min',
    author: 'Coach James',
    img: 'https://images.pexels.com/photos/4761352/pexels-photo-4761352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: false,
    body: [
      'The HIIT vs steady-state cardio debate has raged for years. The truth? Both work, but they work differently. HIIT burns more calories per minute and triggers EPOC (excess post-exercise oxygen consumption), meaning you keep burning calories for hours after the workout.',
      'Steady-state cardio — jogging, cycling, swimming at a moderate pace — burns more total calories during the session itself and is easier to sustain for longer durations. It is also gentler on your joints and nervous system.',
      'For fat loss specifically, research shows HIIT has a slight edge when time is limited. A 20-minute HIIT session can match the calorie burn of a 45-minute steady-state session. But if you have the time and enjoy longer sessions, steady-state is equally effective.',
      'The best approach? Do both. Two HIIT sessions and two steady-state sessions per week gives you the metabolic boost of intervals plus the aerobic base of endurance work. Your body adapts to variety faster than repetition.',
      'At STHENOFY, our HIIT Inferno and Spin Cycle classes cover both ends of the spectrum. Try one of each and see what your body responds to best.',
    ],
    quote: 'The best cardio is the one you will actually do consistently. Intensity matters less than consistency.',
  },
  {
    title: 'Nutrition 101: Building Your First Meal Plan',
    category: 'Nutrition',
    excerpt: 'Stop guessing and start measuring. A simple framework for calculating macros and building sustainable meals.',
    date: 'Aug 28, 2026',
    readTime: '10 min',
    author: 'Coach Sarah',
    img: 'https://images.pexels.com/photos/6246658/pexels-photo-6246658.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: false,
    body: [
      'Nutrition does not have to be complicated. The foundation of any good meal plan starts with calculating your TDEE (Total Daily Energy Expenditure) — the number of calories you burn in a day based on your age, weight, height, and activity level.',
      'Once you know your TDEE, adjust based on your goal: subtract 300-500 calories for fat loss, add 300-500 for muscle gain, or match it for maintenance. Then split those calories into macronutrients: protein (30%), carbs (40%), and fats (30%) is a solid starting point.',
      'Protein is non-negotiable. Aim for 0.8-1g per pound of body weight. Good sources: chicken, fish, eggs, Greek yogurt, tofu, legumes. Carbs fuel your workouts — rice, oats, potatoes, fruit. Fats regulate hormones — olive oil, nuts, avocado, salmon.',
      'Meal timing matters less than total intake, but spreading protein across 3-4 meals (30-40g each) maximizes muscle protein synthesis. Pre-workout carbs improve performance; post-workout protein and carbs accelerate recovery.',
      'The biggest mistake people make? Trying to be perfect. Consistency at 80% beats perfection at 100% that lasts one week. Build a plan you can follow for months, not days.',
    ],
    quote: 'You cannot out-train a bad diet. But you also cannot out-diet a bad mindset.',
  },
  {
    title: 'Mobility Routines for Lifters: Stay Injury-Free',
    category: 'Mobility',
    excerpt: 'Tight hips and shoulders limiting your lifts? These 10-minute routines will keep you moving pain-free.',
    date: 'Aug 20, 2026',
    readTime: '5 min',
    author: 'Coach Lisa',
    img: 'https://images.pexels.com/photos/3768730/pexels-photo-3768730.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: false,
    body: [
      'Mobility is not the same as flexibility. Flexibility is how far a muscle can stretch passively. Mobility is how actively you can move a joint through its full range of motion. For lifters, mobility is what keeps you safe under heavy loads.',
      'The big three problem areas for most lifters: hips, shoulders, and ankles. Tight hips limit your squat depth and cause lower back rounding. Tight shoulders restrict overhead press range. Tight ankles kill your squat depth and stability.',
      'A 10-minute daily routine: 90/90 hip rotations (2 min), deep squat holds (2 min), wall slides (2 min), ankle dorsiflexion drills (2 min), thoracic spine rotations (2 min). Do this before every workout or on rest days.',
      'The key is frequency, not duration. Ten minutes every day beats one hour once a week. Your nervous system adapts to repeated signals, and mobility is a neurological skill as much as a physical one.',
      'At STHENOFY, our Vinyasa Flow and Pilates Core classes are designed to complement your lifting program. Add one or two per week and watch your lifts improve.',
    ],
    quote: 'Mobility is the foundation of strength. You cannot build power on a restricted base.',
  },
  {
    title: 'The Mental Game: Building Gym Consistency',
    category: 'Mindset',
    excerpt: 'Motivation fades. Systems last. Here are the proven strategies our most consistent members use to never miss a session.',
    date: 'Aug 14, 2026',
    readTime: '9 min',
    author: 'Coach Marcus',
    img: 'https://images.pexels.com/photos/6390227/pexels-photo-6390227.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    featured: false,
    body: [
      'Motivation is a feeling. Feelings change. The members who succeed at STHENOFY are not the ones who feel motivated every day — they are the ones who show up regardless of how they feel. This is the difference between motivation and discipline.',
      'The most powerful strategy: schedule your workouts like appointments. Put them in your calendar with a specific time, not "sometime today." Treat them with the same respect you would a meeting with your boss. Non-negotiable.',
      'Reduce friction. Pack your gym bag the night before. Lay out your clothes. Choose a gym close to home or work. The fewer decisions between you and the gym, the more likely you are to go.',
      'Track your sessions. A simple wall calendar with an X on every workout day creates a visual chain you will not want to break. After 30 days, the habit is wired. After 90 days, it is part of your identity.',
      'Expect bad days. You will have workouts where you feel weak, tired, and unmotivated. Go anyway. The workout you almost skipped is often the one that turns your week around. Action creates motivation, not the other way around.',
    ],
    quote: 'Discipline is choosing what you want most over what you want now. Show up, especially when you do not want to.',
  },
];

const categories = ['All', 'Strength', 'Cardio', 'Recovery', 'Nutrition', 'Mobility', 'Mindset'];

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPost, setSelectedPost] = useState<number | null>(null);

  const closePost = useCallback(() => setSelectedPost(null), []);

  useEffect(() => {
    if (selectedPost === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePost();
    };
    window.addEventListener('keydown', handleKey);
    window.scrollTo(0, 0);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPost, closePost]);

  const filteredPosts = activeCategory === 'All'
    ? blogPosts
    : blogPosts.filter((p) => p.category === activeCategory);

  const featuredPost = blogPosts.find((p) => p.featured);

  if (selectedPost !== null) {
    const post = blogPosts[selectedPost];
    return (
      <div className="noise-overlay min-h-screen pt-20">
        <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
          <button
            onClick={closePost}
            className="text-ink-300 hover:text-gold-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-8 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Blog
          </button>
          <div className="section-label mb-4">
            <Flame className="w-4 h-4" />
            <span>{post.category}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-ink-400 text-sm mb-8 pb-8 border-b border-ink-50/10">
            <span className="flex items-center gap-2"><User className="w-4 h-4 text-gold-400" /> {post.author}</span>
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold-400" /> {post.date}</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold-400" /> {post.readTime} read</span>
          </div>
          <img src={post.img} alt={post.title} className="w-full rounded-2xl mb-8 object-cover max-h-96" />
          <div className="max-w-none space-y-6 text-ink-200 leading-relaxed text-base sm:text-lg">
            <p className="text-lg sm:text-xl text-ink-100 font-light">{post.excerpt}</p>
            {post.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            <blockquote className="border-l-4 border-gold-400 pl-6 italic text-lg sm:text-xl text-ink-100">
              "{post.quote}" — {post.author}
            </blockquote>
          </div>
          <div className="mt-12 pt-8 border-t border-ink-50/10">
            <button onClick={closePost} className="btn-outline">
              Back to All Articles
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Flame className="w-4 h-4" />
            <span>The STHENOFY Blog</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            KNOWLEDGE IS <span className="text-gold-400">POWER</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Training tips, nutrition guides, and expert insights from our coaches. Learn the science behind your sweat.
          </p>
        </div>
      </section>

      {/* Featured post */}
      {featuredPost && (
        <section className="pb-12">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <button
              className="group relative rounded-2xl overflow-hidden cursor-pointer w-full text-left"
              onClick={() => setSelectedPost(blogPosts.indexOf(featuredPost))}
            >
              <div className="grid md:grid-cols-2">
                <div className="aspect-video md:aspect-auto md:h-full relative overflow-hidden">
                  <img src={featuredPost.img} alt={featuredPost.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="glass p-8 md:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">Featured</span>
                    <span className="text-ink-400 text-sm">{featuredPost.category}</span>
                  </div>
                  <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4 group-hover:text-gold-400 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-ink-300 leading-relaxed mb-6">{featuredPost.excerpt}</p>
                  <div className="flex flex-wrap items-center gap-3 text-ink-400 text-sm mb-6">
                    <span>{featuredPost.author}</span>
                    <span>•</span>
                    <span>{featuredPost.date}</span>
                    <span>•</span>
                    <span>{featuredPost.readTime} read</span>
                  </div>
                  <span className="text-gold-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2 group-hover:gap-4 transition-all">
                    Read Article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Category filter */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'bg-gold-400 text-ink-950'
                    : 'glass text-ink-300 hover:text-gold-400 hover:border-gold-400/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPosts.map((post, i) => (
              <button
                key={i}
                className="card-hover group glass rounded-2xl overflow-hidden cursor-pointer text-left"
                onClick={() => setSelectedPost(blogPosts.indexOf(post))}
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={post.img} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute top-3 left-3">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{post.category}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl uppercase tracking-wide mb-3 group-hover:text-gold-400 transition-colors">{post.title}</h3>
                  <p className="text-ink-300 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-3 text-ink-400 text-xs">
                    <span className="flex items-center gap-1"><User className="w-3 h-3 text-gold-400" /> {post.author}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold-400" /> {post.readTime}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
