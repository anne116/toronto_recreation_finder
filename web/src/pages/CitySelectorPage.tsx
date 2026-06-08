import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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

    const handdleCityCardClick = (cityName: string) => {
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
        <div className="city-selector-page">
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

            <div className="city-selector-container">
                <header className="city-selector-header">
                    <h1>City Recreation Finder</h1>
                    <p>Find drop-in programs and registered activities provided by your city's recreation centres</p>
                </header>

                <section className="available-cities">
                    <h2>Available Cities</h2>
                    <div className="city-grid">
                        <Link 
                            to="/toronto"
                            className="city-card"
                            onClick={() => handdleCityCardClick('Toronto')}
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
    );
}