import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaSwimmer, FaTableTennis } from 'react-icons/fa';
import { LiaDumbbellSolid } from "react-icons/lia";
import { GiCampingTent } from "react-icons/gi";
import { TbYoga } from 'react-icons/tb';
import { GrYoga } from "react-icons/gr";
import { MdChevronRight, MdOutlineSportsBasketball, MdOutlineFamilyRestroom, MdOutlineCastForEducation, MdOutlinePalette } from 'react-icons/md';
import { GiShuttlecock, GiTennisRacket } from 'react-icons/gi';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { generateWebApplicationSchema, generatedItemListedSchema } from '../shared/lib/schema';
import Navbar from '../shared/ui/Navbar';
import './CitySelectorPage.css';
import { trackEvent } from '../shared/lib/analytics';

// Activity names must exactly match api/_lib/data.py (drop-in) and
// api/_lib/registered_taxonomy.py (registered).
const DROPIN_SPORT_ACTIVITIES: Record<string, string[]> = {
    'Table Tennis': ['Table Tennis', 'Table Tennis (Women)', 'Table Tennis with Family'],
    'Badminton': ['Badminton', 'Badminton (Women)', 'Badminton - Court', 'Badminton with Caregiver', 'Badminton with Family'],
    'Basketball': ['Basketball', 'Basketball (Girls)', 'Basketball (Men)', 'Basketball (Women)', 'Basketball with Family', 'Parasport: Wheelchair Basketball'],
};

const REGISTERED_TENNIS_ACTIVITIES = [
    'CampTO Plus: Tennis',
    'Clinic: Tennis - Hitting Spin Shots',
    'Clinic: Tennis - Reading Plays & Ball Direction',
    'Philpott Tennis',
    'Tennis - Private',
    'Tennis - Semi Private',
    'Tennis - Small Group',
    'Tennis: Instructional',
    'Tennis: Instructional - Advanced',
    'Tennis: Instructional - Advanced - Small Group',
    'Tennis: Instructional - Beginner',
    'Tennis: Instructional - Intermediate',
    'Tennis: Instructional - Intermediate - Small Group',
    'Tennis: Instructional with Caregiver',
    'Tennis: Recreational',
];

type ProgramTypeParam = 'dropin' | 'registered';

function torontoSearchPath(
    programType: ProgramTypeParam,
    opts: { category?: string; activities?: string[] } = {}
) {
    const params = new URLSearchParams();
    params.set('programType', programType);
    if (opts.category) params.set('category', opts.category);
    for (const activity of opts.activities ?? []) {
        params.append('activity', activity);
    }
    return `/toronto?${params.toString()}`;
}

function handleActivityCardClick(card: string, programType: ProgramTypeParam) {
    trackEvent('landing_activity_card_clicked', {
        card,
        program_type: programType,
    });
}

function SectionCta({ label, source }: { label?: string; source: string }) {
    const handleClick = () => {
        trackEvent('city_selected', {
            city: 'Toronto',
            source: `landing_${source}`,
        });
    };

    return (
        <div className="landing-section-cta">
            <Link to="/toronto" className="landing-section-cta__pill" onClick={handleClick}>
                <HiOutlineMapPin size={16} />
                <span>{label ?? 'Find Toronto drop-in & registered programs now'}</span>
                <MdChevronRight size={16} />
            </Link>
        </div>
    );
}

export default function CitySelectorPage() {
    const GOOGLE_FORM_EMBED_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe5OWlVTy9aLpPP4DZWO3JHgkJP8Kwyi9DH0B5Xs6u_9m8Wxg/viewform?embedded=true';
    const { hash } = useLocation();

    useEffect(() => {
        if (!hash) return;
        const target = document.getElementById(hash.slice(1));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [hash]);

    const pageTitle = 'Find Drop-in & Registered Programs in Toronto | City Recreation Finder';
    const pageDescription = 'Search Drop-in and registered recreation programs across Toronto recreation centres. Filter by location, activity, age, and schedule.'
    const canonicalUrl = 'https://cityrecreationfinder.com';

    const webAppSchema = generateWebApplicationSchema({
        name: 'City Recreation Finder',
        url: canonicalUrl,
        description: 'Find drop-in and registered programs at recreation centres across Toronto',
    });

    const absoluteUrl = (path: string) => `${canonicalUrl}${path}`;

    const dropInProgramsSchema = generatedItemListedSchema({
        name: 'Drop-in Programs in Toronto',
        description: 'Popular Toronto drop-in recreation activities you can search for right now.',
        items: [
            { position: 1, name: 'Swimming', url: absoluteUrl(torontoSearchPath('dropin', { category: 'Swimming' })) },
            { position: 2, name: 'Gym', url: absoluteUrl(torontoSearchPath('dropin', { category: 'Fitness & Workout' })) },
            { position: 3, name: 'Table Tennis', url: absoluteUrl(torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Table Tennis'] })) },
            { position: 4, name: 'Badminton', url: absoluteUrl(torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Badminton'] })) },
            { position: 5, name: 'Basketball', url: absoluteUrl(torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Basketball'] })) },
            { position: 6, name: 'Yoga & Pilates', url: absoluteUrl(torontoSearchPath('dropin', { category: 'Yoga, Pilates & Wellness' })) },
        ],
    });

    const registeredProgramsSchema = generatedItemListedSchema({
        name: 'Registered Programs in Toronto',
        description: 'Popular Toronto registered recreation programs you can search for right now.',
        items: [
            { position: 1, name: 'Family & Caregiver Programs', url: absoluteUrl(torontoSearchPath('registered', { category: 'Early Childhood & Family Programs' })) },
            { position: 2, name: 'Tennis Classes', url: absoluteUrl(torontoSearchPath('registered', { activities: REGISTERED_TENNIS_ACTIVITIES })) },
            { position: 3, name: 'Camps & School Break Programs', url: absoluteUrl(torontoSearchPath('registered', { category: 'Camps & School Break Programs' })) },
            { position: 4, name: 'Education & Life Skills Workshops', url: absoluteUrl(torontoSearchPath('registered', { category: 'Education & Life Skills' })) },
            { position: 5, name: 'Arts & Crafts Lessons', url: absoluteUrl(torontoSearchPath('registered', { category: 'Arts & Crafts' })) },
            { position: 6, name: 'Fitness & Wellness Classes', url: absoluteUrl(torontoSearchPath('registered', { category: 'Fitness & Wellness' })) },
        ],
    });

    const handleCityCardClick = (cityName: string) => {
        trackEvent('city_selected', {
            city: cityName,
        });
    };

    const handleFormInteraction = () => {
        trackEvent('city_request_form_interacted', {
            form_type: 'google_form',
        });
    };

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content="City Recreation Finder - Toronto drop-in & registered programs" />
                <meta property="og:description" content="Find drop-in and registered programs at recreation centres acroos Toronto" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:type" content="website" />
                <script type="application/ld+json">
                  {JSON.stringify(webAppSchema)}
                </script>
                <script type="application/ld+json">
                  {JSON.stringify(dropInProgramsSchema)}
                </script>
                <script type="application/ld+json">
                  {JSON.stringify(registeredProgramsSchema)}
                </script>
            </Helmet>

            <Navbar variant="home" />

            <section className="landing-hero">
                <div className="landing-hero__container">
                    <div className="landing-hero__content">
                        <div className="landing-hero__eyebrow animate-fade-up-1">
                            Free · No account needed
                        </div>

                        <h1 className="landing-hero__title animate-fade-up-2">
                            Find drop-in & registered programs at your city's recreation centres
                        </h1>

                        <p className="landing-hero__description animate-fade-up-3">
                            Recreation centres offer hundreds of programs — swimming, skating, fitness, arts and more.
                            We make them easy to search and find, without digging through city portals.
                        </p>

                        <p className="landing-hero__description animate-fade-up-4">
                            No more clicking through the city portal page by page.
                        </p>

                        <div className="landing-hero__buttons animate-fade-up-5">
                            <Link
                                to={torontoSearchPath('dropin')}
                                className="landing-hero__button--primary"
                                onClick={() => trackEvent('city_selected', { city: 'Toronto', source: 'landing_hero_dropin' })}
                            >
                                Find Toronto drop-in programs
                            </Link>
                            <Link
                                to={torontoSearchPath('registered')}
                                className="landing-hero__button--outline"
                                onClick={() => trackEvent('city_selected', { city: 'Toronto', source: 'landing_hero_registered' })}
                            >
                                Find Toronto registered programs
                            </Link>
                        </div>

                        <p className="landing-hero__caption animate-fade-up-5">
                            Currently serving Toronto · More cities coming — <a href="#request-city">request yours</a>
                        </p>
                    </div>
                </div>
            </section>

            <section className="landing-programs">
                <div className="landing-programs__container">
                    <h2 className="landing-programs__title">Drop-in Programs</h2>
                    <div className="landing-programs__grid">
                        <Link
                            to={torontoSearchPath('dropin', { category: 'Swimming' })}
                            className="landing-activity-card animate-float-1"
                            onClick={() => handleActivityCardClick('Swimming', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <FaSwimmer size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Swimming</div>
                            <div className="landing-activity-card__subtitle">All ages · Skill levels</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('dropin', { category: 'Fitness & Workout' })}
                            className="landing-activity-card animate-float-2"
                            onClick={() => handleActivityCardClick('Gym', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <LiaDumbbellSolid size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Gym</div>
                            <div className="landing-activity-card__subtitle">Cardio · Weights</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Table Tennis'] })}
                            className="landing-activity-card animate-float-3"
                            onClick={() => handleActivityCardClick('Table Tennis', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <FaTableTennis size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Table Tennis</div>
                            <div className="landing-activity-card__subtitle">All Levels · Indoor Courts</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Badminton'] })}
                            className="landing-activity-card animate-float-4"
                            onClick={() => handleActivityCardClick('Badminton', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <GiShuttlecock size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Badminton</div>
                            <div className="landing-activity-card__subtitle">All Levels · Casual Play</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('dropin', { activities: DROPIN_SPORT_ACTIVITIES['Basketball'] })}
                            className="landing-activity-card animate-float-5"
                            onClick={() => handleActivityCardClick('Basketball', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <MdOutlineSportsBasketball size={24} />
                            </div>
                            <div className="landing-activity-card__name">Basketball</div>
                            <div className="landing=activity-card__subtitle">Pick-up Games · Hardwood Courts</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('dropin', { category: 'Yoga, Pilates & Wellness' })}
                            className="landing-activity-card animate-float-6"
                            onClick={() => handleActivityCardClick('Yoga & Pilates', 'dropin')}
                        >
                            <div className="landing-activity-card__icon">
                                <GrYoga size={24} />
                            </div>
                            <div className="landing-activity-card__name">Yoga & Pilates</div>
                            <div className="landing-actiivty-card__subtitle">All Levels · Mind & Body</div>
                        </Link>
                    </div>

                    <SectionCta label="Find Toronto drop-in programs now" source="dropin_programs" />
                </div>
            </section>

            <section className="landing-programs">
                <div className="landing-programs__container">
                    <h2 className="landing-programs__title">Registered Programs</h2>
                    <div className="landing-programs__grid">
                        <Link
                            to={torontoSearchPath('registered', { category: 'Early Childhood & Family Programs' })}
                            className="landing-activity-card animate-fade-up-1"
                            onClick={() => handleActivityCardClick('Family & Caregiver Programs', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <MdOutlineFamilyRestroom size={24} />
                            </div>
                            <div className="landing-activity-card__name">Family & Caregiver Programs</div>
                            <div className="landing-activity-card_subtitle">Parent-Child · Toddler · Family Activities</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('registered', { activities: REGISTERED_TENNIS_ACTIVITIES })}
                            className="landing-activity-card animate-fade-up-2"
                            onClick={() => handleActivityCardClick('Tennis Classes', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <GiTennisRacket size={24} />
                            </div>
                            <div className="landing-activity-card__name">Tennis Classes</div>
                            <div className="landing-activity-card__subtitle">All Ages · Private · Small Group · Instructional</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('registered', { category: 'Camps & School Break Programs' })}
                            className="landing-activity-card animate-fade-up-3"
                            onClick={() => handleActivityCardClick('Camps & School Break Programs', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <GiCampingTent size={24} />
                            </div>
                            <div className="landing-activity-card__name">Camps & School Break Programs</div>
                            <div className="landing-activity-card__subtitle">After-School · Summer Camps</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('registered', { category: 'Education & Life Skills' })}
                            className="landing-activity-card animate-fade-up-4"
                            onClick={() => handleActivityCardClick('Education & Life Skills Workshops', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <MdOutlineCastForEducation size={24} />
                            </div>
                            <div className="landing-activity-card__name">Education & Life Skills Workshops</div>
                            <div className="landing-activity-card_subtitle">Financial Literacy · Leadership · Tech</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('registered', { category: 'Arts & Crafts' })}
                            className="landing-activity-card animate-fade-up-5"
                            onClick={() => handleActivityCardClick('Arts & Crafts Lessons', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <MdOutlinePalette size={24} />
                            </div>
                            <div className="landing-activity-card__name">Arts & Crafts Lessons</div>
                            <div className="landing-activity-card__subtitle">Pottery · Painting · Sculpting</div>
                        </Link>

                        <Link
                            to={torontoSearchPath('registered', { category: 'Fitness & Wellness' })}
                            className="landing-activity-card animate-fade-up-6"
                            onClick={() => handleActivityCardClick('Fitness & Wellness Classes', 'registered')}
                        >
                            <div className="landing-activity-card__icon">
                                <TbYoga size={24} />
                            </div>
                            <div className="landing-activity-card__name">Fitness & Wellness Classes</div>
                            <div className="landing-activity-card__subtitle">Yoga · HIIT · Beginner to Advanced</div>
                        </Link>
                    </div>

                    <SectionCta label="Find Toronto registered programs now" source="registered_programs" />
                </div>
            </section>

            <section className="landing-features">
                <div className="landing-features__container">
                    <div className="landing-features__eyebrow">What you can find</div>
                    <h2 className="landing-features__title">Everything your city offers, <br />finally easy to browse</h2>
                    <p className="landing-features__description">Drop-in or registered - filter by category/activity, location, day and age group, all in one place.</p>

                    <div className="landing-features__grid">
                        <div className="landing-feature-card">
                            <div className="landing-feature-card__preview">
                                <div className="feature-mini-stack">
                                    <div className="feature-mini-card">
                                        <div className="feature-mini-card__title">Recreation Fun and Play with Caregiver</div>
                                        <div className="feature-mini-card__meta">North Toronto Memorial Community Centre · Mon 9:00am</div>
                                        <div className="feature-mini-card_badges">
                                            <span className="feature-badge feature-badge--teal">Drop-in</span>
                                            <span className="feature-badge feature-badge--green">Open</span>
                                        </div>
                                    </div>
                                    <div className="feature-mini-card">
                                        <div className="feature-mini-card__title">Pickleball — Young Adults(18-24)</div>
                                        <div className="feature-mini-card__meta">Mary McCormick Recreation Centre · Mon 07:00am</div>
                                        <div className="feature-mini-card__badges">
                                            <span className="feature-badge feature-badge--teal">Drop-in</span>
                                            <span className="feature-badge feature-badge--green">Open</span>
                                        </div>
                                    </div>
                                    <div className="feature-mini-card">
                                        <div className="feature-mini-card__title">Aquatic Fitness: Shallow</div>
                                        <div className="feature-mini-card__meta">York Recreation Centre · Mon 08:30am</div>
                                        <div className="feature-mini-card__badges">
                                            <span className="feature-badge feature-badge--teal">Drop-in</span>
                                            <span className="feature-badge feature-badge--green">Open</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="landing-feature-card__body">
                                <h3 className="landing-feature-card__title">Drop-in programs</h3>
                                <p className="landing-feature-card__desc">Show up any time — no registration. Filter by day, district, age group and activity.</p>
                            </div>                            
                        </div>

                        <div className="landing-feature-card">
                            <div className="landing-feature-card__preview">
                                <div className="feature-mini-stack">
                                    <div className="feature-reg-card">
                                        <div className="feature-reg-card__title">Learn to Skate — Beginner</div>
                                        <div className="feature-reg-card__meta">Starts Jan 13 · 8 weeks · North York</div>
                                        <div className="feature-reg-bar">
                                            <div className="feature-reg-bar__fill" style={{width: '60%'}}></div>
                                        </div>
                                    </div>
                                    <div className="feature-reg-card">
                                        <div className="feature-reg-card__title">Basketball: Instructional — Teens(13-16)</div>
                                        <div className="feature-reg-card__meta">Starts Jul 10 · 8 weeks · Scarborough</div>
                                        <div className="feature-reg-bar">
                                            <div className="feature-reg-bar__fill" style={{width: '30%'}}></div>
                                        </div>
                                    </div>
                                    <div className="feature-reg-card">
                                        <div className="feature-reg-card__title">CampTO Plus: Computers — Children(6-12)</div>
                                        <div className="feature-reg-card__meta">Starts Jan 29 · 2 weeks · Toronto and East York</div>
                                        <div className="feature-reg-bar">
                                            <div className="feature-reg-bar__fill" style={{width: '30%'}}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="landing-feature-card__body">
                                <h3 className="landing-feature-card__title">Registered programs</h3>
                                <p className="landing-feature-card__desc">Multi-week courses and classes. See what's open for registration right now.</p>
                            </div>
                        </div>
                        <div className="landing-feature-card">
                            <div className="landing-feature-card__preview">
                                <div className="feature-map-mini">
                                <div className="feature-map-mini__grid"></div>
                                <div className="feature-map-pin" style={{left: '25%', top: '30%'}}>
                                    <div className="feature-map-pin__ring"></div>
                                </div>
                                <div className="feature-map-pin feature-map-pin--dim" style={{left: '55%', top: '40%'}}></div>
                                <div className="feature-map-pin feature-map-pin--dim" style={{left: '70%', top: '60%'}}></div>
                                <div className="feature-map-pin feature-map-pin--dim" style={{left: '38%', top: '58%'}}></div>
                            </div>
                            </div>
                            <div className="landing-feature-card__body">
                                <h3 className="landing-feature-card__title">Interactive map</h3>
                                <p className="landing-feature-card__desc">Every centre on a map. Click a pin to see its full program schedule at a glance.</p>
                            </div>
                        </div>
                    </div>

                    <SectionCta source="features" />
                </div>
            </section>

            <section className="landing-alternating">
                <div className="landing-alternating__container">
                    <div className="landing-alt-row">
                        <div className="landing-alt-content">
                            <div className="landing-alt-eyebrow">Drop-in programs</div>
                            <h2 className="landing-alt-title">Filter once,<br />find it instantly</h2>
                            <p className="landing-alt-description">Pick activity, district, day and age group. Your results appear immediately — no page reloads. Monday morning lane swims to Sunday afternoon yoga, all in one search.</p>
                        </div>
                        <div className="landing-alt-visual">
                            <div className="filter-demo">
                                <div className="filter-demo-row filter-demo-row--active">
                                    <span>Aquatics — Lane swim</span>
                                    <span>✓</span>
                                </div>
                                <div className="filter-demo-row filter-demo-row--active">
                                    <span>Etobicoke</span>
                                    <span>✓</span>
                                </div>
                                <div className="filter-demo-row">
                                    <span>Day of week</span>
                                    <span style={{color: '#C0CCCB'}}>▾</span>
                                </div>
                                <div className="filter-demo-row">
                                    <span>Age group</span>
                                    <span style={{color: '#C0CCCB'}}>▾</span>
                                </div>
                                <button className="filter-demo-btn">Search programs</button>
                            </div>
                            <div className="result-cards">
                                <div className="result-card animate-slide-in-1">
                                    <div className="result-card__title">Lane Swim — Adult</div>
                                    <div className="result-card__meta">📍 Centennial Park Pool · Tue 6:30am</div>
                                    <div className="result-card__badges">
                                        <span className="result-badge result-badge--teal">Drop-in</span>
                                        <span className="result-badge result-badge--green">Open</span>
                                        <span className="result-badge result-badge--gray">18+</span>
                                    </div>
                                </div>
                                <div className="result-card animate-slide-in-2">
                                    <div className="result-card__title">Lane Swim — Adult</div>
                                    <div className="result-card__meta">📍 Etobicoke Olympium · Tue 7:00am</div>
                                    <div className="result-card__badges">
                                        <span className="result-badge result-badge--teal">Drop-in</span>
                                        <span className="result-badge result-badge--green">Open</span>
                                        <span className="result-badge result-badge--gray">16+</span>
                                    </div>
                                </div>
                                <div className="result-card animate-slide-in-3">
                                    <div className="result-card__title">Aquafit — Seniors</div>
                                    <div className="result-card__meta">📍 Richview Pool · Tue 11:00am</div>
                                    <div className="result-card__badges">
                                        <span className="result-badge result-badge--teal">Drop-in</span>
                                        <span className="result-badge result-badge--green">Open</span>
                                        <span className="result-badge result-badge--gray">55+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="landing-alt-row landing-alt-row--reversed">
                        <div className="landing-alt-content">
                            <div className="landing-alt-eyebrow">Registered programs</div>
                            <h2 className="landing-alt-title">See what's open<br />for registration now</h2>
                            <p className="landing-alt-description">Multi-week courses fill up fast. See registration status at a glance — open, limited spots, or waitlist — and link straight to the city portal to sign up.</p>
                        </div>

                        <div className="landing-alt-visual">
                            <div className="reg-preview">
                                <div className="reg-preview-card">
                                    <div className="reg-preview-card__top">
                                        <div className="reg-preview-card__title">Learn to Skate — Beginner</div>
                                        <span className="reg-preview-badge">Open</span>
                                    </div>
                                    <div className="reg-preview-card__meta">📍 North York Civic · Starts Jan 13 · 8 weeks</div>
                                    <div className="reg-preview-bar">
                                        <div className="reg-preview-bar__fill" style={{width: '55%'}}></div>
                                    </div>
                                </div>

                                <div className="reg-preview-card">
                                    <div className="reg-preview-card__top">
                                        <div className="reg-preview-card__title">Youth Basketball — U12</div>
                                        <span className="reg-preview-badge reg-preview-badge--amber">2 spots left</span>
                                    </div>
                                    <div className="reg-preview-card__meta">📍 Scarborough Village · Starts Jan 20 · 10 weeks</div>
                                    <div className="reg-preview-bar">
                                        <div className="reg-preview-bar__fill" style={{width: '88%'}}></div>
                                    </div>
                                </div>

                                <div className="reg-preview-card">
                                    <div className="reg-preview-card__top">
                                        <div className="reg-preview-card__title">Pottery — Intermediate</div>
                                        <span className="reg-preview-badge">Open</span>
                                    </div>
                                    <div className="reg-preview-card__meta">📍 Swansea Memorial · Starts Feb 3 · 6 weeks</div>
                                    <div className="reg-preview-bar">
                                        <div className="reg-preview-bar__fill" style={{width: '30%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <SectionCta source="alternating_showcase" />
            </section>

            <section id="how-it-works" className="landing-how-it-works">
                <div className="landing-how-it-works__container">
                    <div className="landing-how-it-works__eyebrow">How it works</div>
                    <h2 className="landing-how-it-works__title">Find a program in three steps</h2>
                    <p className="landing-how-it-works__description">No account needed. No setup. Just pick your filters and go.</p>

                    <div className="landing-steps-grid">
                        <div className="landing-step-card">
                            <div className="landing-step-card__icon-wrap animate-step-bounce-1">
                                🔍
                            </div>
                            <div className="landing-step-card__number">STEP 01</div>
                            <h3 className="landing-step-card__title">Pick your city & filters</h3>
                            <p className="landing-step-card__desc">Select your city, then choose activity, district, day of week, and age group.</p>
                        </div>

                        <div className="landing-step-card">
                            <div className="landing-step-card__icon-wrap animate-step-bounce-2">
                                📋
                            </div>
                            <div className="landing-step-card__number">STEP 02</div>
                            <h3 className="landing-step-card__title">Browse results</h3>
                            <p className="landing-step-card__desc">See matching sessions in a day-by-day schedule alongside a live map of centres.</p>
                        </div>

                        <div className="landing-step-card">
                            <div className="landing-step-card__icon-wrap animate-step-bounce-3">
                                🏃
                            </div>
                            <div className="landing-step-card__number">STEP 03</div>
                            <h3 className="landing-step-card__title">Show up or register</h3>
                            <p className="landing-step-card__desc">Drop-ins need no booking — just show up. Registered programs link straight to the city portal.</p>
                        </div>
                    </div>

                    <SectionCta label="Try it now — find Toronto programs" source="how_it_works" />
                </div>
            </section>

            <section className="landing-map-section">
                <div className="landing-map-section__container">
                    <div className="landing-map-section__header">
                        <div className="landing-map-section__eyebrow">Interactive map</div>
                        <h2 className="landing-map-section__title">Every centre on a map — click to explore</h2>
                        <p className="landing-map-section__description">Click any pin to see that centre's programs. Click a session to jump to its location. The map and schedule panel are always in sync.</p>
                    </div>

                    <div className="landing-map-full">
                        <div className="landing-map-full__grid"></div>

                        <div className="landing-map-line landing-map-line--h" style={{top: '35%'}}></div>
                        <div className="landing-map-line landing-map-line--h" style={{top: '62%'}}></div>
                        <div className="landing-map-line landing-map-line--v" style={{left: '25%'}}></div>
                        <div className="landing-map-line landing-map-line--v" style={{left: '58%'}}></div>

                    <div className="landing-map-marker" style={{left: '25%', top: '20%'}}>
                        <div className="landing-map-marker__pin landing-map-marker__pin--dim" style={{animationDelay: '0.5s'}}></div>
                        <div className="landing-map-marker__label landing-map-marker__label--dim">North Toronto Memorial Community Centre</div>
                    </div>

                    <div className="landing-map-marker" style={{left: '58%', top: '27%'}}>
                        <div className="landing-map-marker__pin landing-map-marker__pin--dim" style={{animationDelay: '0.2s'}}></div>
                        <div className="landing-map-marker__label landing-map-marker__label--dim">Milliken Park Community Recreation Centre</div>
                    </div>

                    <div className="landing-map-marker" style={{left: '40%', top: '52%'}}>
                        <div className="landing-map-marker__pin landing-map-marker__pin--dim" style={{animationDelay: '0.3s'}}></div>
                        <div className="landing-map-marker__label landing-map-marker__label--dim">O'Connor Community Centre</div>
                    </div>

                    <div className="landing-map-marker" style={{left: '68%', top: '57%'}}>
                        <div className="landing-map-marker__pin landing-map-marker__pin--dim" style={{animationDelay: '0.4s'}}></div>
                        <div className="landing-map-marker__label landing-map-marker__label--dim">Toronto Pan Am Sports Centre</div>
                    </div>

                    <div className="landing-map-marker" style={{left: '15%', top: '60%'}}>
                        <div className="landing-map-marker__pin-wrap">
                            <div className="landing-map-marker__ring"></div>
                            <div className="landing-map-marker__pin landing-map-marker__pin--active" style={{animationDelay: '0.1s'}}></div>
                        </div>
                        <div className="landing-map-marker__label landing-map-marker__label--active">Trinity Community Recreation Centre</div>
                    </div>

                    <div className="landing-map-counter">5 centres found</div>
                </div>

                <div className="landing-map-stats">
                    <div className="landing-map-stat">
                        <div className="landing-map-stat__number">100+</div>
                        <div className="landing-map-stat__label">Centres on the map</div>
                    </div>
                    <div className="landing-map-stat">
                        <div className="landing-map-stat__number">4</div>
                        <div className="landing-map-stat__label">Districts covered</div>
                    </div>
                    <div className="landing-map-stat">
                        <div className="landing-map-stat__number">Weekly</div>
                        <div className="landing-map-stat__label">Data updates</div>
                    </div>
                </div>

                <SectionCta label="Explore Toronto centres on the map" source="map_section" />
                </div>
            </section>

            <section className="landing-cities">
                <div className="landing-cities__container">
                    <h2 className="landing-cities__title">Available Cities</h2>
                    <div className="landing-cities__grid">
                        <Link
                            to="/toronto"
                            className="landing-city-card"
                            onClick={() => handleCityCardClick('Toronto')}
                        >
                            <div className="landing-city-card__icon">🏙️</div>
                            <h3 className="landing-city-card__name">Toronto</h3>
                            <p className="landing-city-card__description">Browse 150+ recreation centres</p>
                        </Link>

                        <div id="request-city" className="landing-city-card landing-city-card--request">
                            <div className="landing-city-card__icon">🌆</div>
                            <h3 className="landing-city-card__name">Don't see your city?</h3>
                            <p className="landing-city-card__description">Let us know which city you'd like us to add next!</p>
                            <div
                                className="landing-city-card__form"
                                onClick={handleFormInteraction}
                            >
                                <iframe
                                    src={GOOGLE_FORM_EMBED_URL}
                                    width="100%"
                                    height="380"
                                    frameBorder="0"
                                    marginHeight={0}
                                    marginWidth={0}
                                    title="City Request Form"
                                >
                                    Loading form...
                                </iframe>
                            </div>
                        </div>
                    </div>

                    <SectionCta label="Meanwhile, explore Toronto programs" source="request_city" />
                </div>
            </section>

            <footer className="landing-footer">
                <div className="landing-footer__container">
                    <p className="landing-footer__text">More cities coming soon based on demand</p>
                </div>
            </footer>
        </>
    );
}