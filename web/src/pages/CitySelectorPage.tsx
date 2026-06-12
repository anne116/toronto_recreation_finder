import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FaSwimmer, FaTableTennis } from 'react-icons/fa';
import { BiSwim } from "react-icons/bi";
import { LiaDumbbellSolid } from "react-icons/lia";
import { GiCampingTent } from "react-icons/gi";
import { TbYoga } from 'react-icons/tb';
import { GrYoga } from "react-icons/gr";
import { MdOutlineSportsBasketball, MdChevronRight, MdOutlineFamilyRestroom, MdOutlineCastForEducation, MdOutlinePalette } from 'react-icons/md';
import { GiShuttlecock, GiTennisRacket } from 'react-icons/gi';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { generateWebApplicationSchema } from '../shared/lib/schema';
import './CitySelectorPage.css';
import { trackEvent } from '../shared/lib/analytics';

export default function CitySelectorPage() {
    const GOOGLE_FORM_EMBED_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe5OWlVTy9aLpPP4DZWO3JHgkJP8Kwyi9DH0B5Xs6u_9m8Wxg/viewform?embedded=true';

    const pageTitle = 'Find Drop-in & Registered Programs in Toronto | City Recreation Finder';
    const pageDescription = 'Search Drop-in and registered recreation programs across Toronto recreation centres. Filter by location, activity, age, and schedule.'
    const canonicalUrl = 'https://cityrecreationfinder.com';

    const webAppSchema = generateWebApplicationSchema({
        name: 'City Recreation Finder',
        url: canonicalUrl,
        description: 'Find drop-in and registered programs at recreation centres across Toronto',
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
            </Helmet>

            <nav className="landing-navbar">
                <div className="landing-navbar__content">
                    <img
                        src="/logo.png"
                        alt="City Recreation Finder"
                        className="landing-navbar__logo"
                    />
                    <Link
                        to="/toronto"
                        className="landing-navbar__city-pill"
                        onClick={() => handleCityCardClick('Toronto')}
                    >
                        <HiOutlineMapPin size={14} />
                        <span>Toronto</span>
                        <MdChevronRight size={14}/>
                    </Link>
                </div>
            </nav>

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
                            <Link to="/toronto"
                            className="landing-hero__button--primary">
                                Browse programs
                            </Link>
                            <Link to="/toronto"
                            className="landing-hero__button--outline">
                                Drop-in today
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-programs">
                <div className="landing-programs__container">
                    <h2 className="landing-programs__title">Drop-in Programs</h2>
                    <div className="landing-programs__grid">
                        <div className="landing-activity-card animate-float-1">
                            <div className="landing-activity-card__icon">
                                <FaSwimmer size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Swimming</div>
                            <div className="landing-activity-card__subtitle">All ages · Skill levels</div>
                        </div>

                        <div className="landing-activity-card animate-float-2">
                            <div className="landing-activity-card__icon">
                                <LiaDumbbellSolid size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Gym</div>
                            <div className="landing-activity-card__subtitle">Cardio · Weights</div>
                        </div>

                        <div className="landing-activity-card animate-float-3">
                            <div className="landing-activity-card__icon">
                                <FaTableTennis size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Table Tennis</div>
                            <div className="landing-activity-card__subtitle">All Levels · Indoor Courts</div>
                        </div>

                        <div className="landing-activity-card animate-float-4">
                            <div className="landing-activity-card__icon">
                                <GiShuttlecock size={24}/>
                            </div>
                            <div className="landing-activity-card__name">Badminton</div>
                            <div className="landing-activity-card__subtitle">All Levels · Casual Play</div>
                        </div>

                        <div className="landing-activity-card animate-float-5">
                            <div className="landing-activity-card__icon">
                                <MdOutlineSportsBasketball size={24} />
                            </div>
                            <div className="landing-activity-card__name">Basketball</div>
                            <div className="landing=activity-card__subtitle">Pick-up Games · Hardwood Courts</div>
                        </div>

                        <div className="landing-activity-card animate-float-6">
                            <div className="landing-activity-card__icon">
                                <GrYoga size={24} />
                            </div>
                            <div className="landing-activity-card__name">Yoga & Pilates</div>
                            <div className="landing-actiivty-card__subtitle">All Levels · Mind & Body</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-programs">
                <div className="landing-programs__container">
                    <h2 className="landing-programs__title">Registered Programs</h2>
                    <div className="landing-programs__grid">
                        <div className="landing-activity-card animate-fade-up-1">
                            <div className="landing-activity-card__icon">
                                <BiSwim size={24} />
                            </div>
                            <div className="landing-activity-card__name">Swimming Lessons</div>
                            <div className="landing-activity-card_subtitle">All Ages · Skill Levels</div>
                        </div>

                        <div className="landing-activity-card animate-fade-up-2">
                            <div className="landing-activity-card__icon">
                                <GiTennisRacket size={24} />
                            </div>
                            <div className="landing-activity-card__name">Tennis Classes</div>
                            <div className="landing-activity-card__subtitle">All Ages · Private · Small Group · Instructional</div>
                        </div>

                        <div className="landing-activity-card animate-fade-up-3">
                            <div className="landing-activity-card__icon">
                                <GiCampingTent size={24} />
                            </div>
                            <div className="landing-activity-card__name">Camps & School Break Programs</div>
                            <div className="landing-activity-card__subtitle">After-School · Summer Camps</div>
                        </div>

                        <div className="landing-activity-card animate-fade-up-4">
                            <div className="landing-activity-card__icon">
                                <MdOutlineCastForEducation size={24} />
                            </div>
                            <div className="landing-activity-card__name">Education & Life Skills Workshops</div>
                            <div className="landing-activity-card_subtitle">Financial Literacy · Leadership · Tech</div>
                        </div>

                        <div className="landing-activity-card animate-fade-up-5">
                            <div className="landing-activity-card__icon">
                                <MdOutlinePalette size={24} />
                            </div>
                            <div className="landing-activity-card__name">Arts & Crafts Lessons</div>
                            <div className="landing-activity-card__subtitle">Pottery · Painting · Sculpting</div>
                        </div>

                        <div className="landing-activity-card animate-fade-up-6">
                            <div className="landing-activity-card__icon">
                                <TbYoga size={24} />
                            </div>
                            <div className="landing-activity-card__name">Fitness & Wellness Classes</div>
                            <div className="landing-activity-card__subtitle">Yoga · HIIT · Beginner to Advanced</div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="city-selector-page">
                <div className="city-selector-container">
                    <section className="available-cities">
                        <h2>Available Cities</h2>
                        <div className="city-grid">
                            <Link 
                                to="/toronto"
                                className="city-card"
                                onClick={() => handleCityCardClick('Toronto')}
                            >
                                <div className="city-card-icon">🏙️</div>
                                <h3>Toronto</h3>
                                <p>Browse 150+ recreation centres</p>
                            </Link>
                        </div>
                    </section>

                    <section className="city-request-form">
                        <h2>Don't see your city?</h2>
                        <p>Let us know which city you'd like us to add next!</p>
                        <div 
                            className="google-form-embed"
                            onClick={handleFormInteraction}
                        >
                            <iframe
                                src={GOOGLE_FORM_EMBED_URL}
                                width="100%"
                                height="600"
                                frameBorder="0"
                                marginHeight={0}
                                marginWidth={0}
                                title="City Request Form"
                            >
                                Loading form...
                            </iframe>
                        </div>
                    </section>

                    <footer className="city-selector-footer">
                        <p>More cities coming soon based on demand</p>
                    </footer>
                </div>
            </div>
        </>
    );
}