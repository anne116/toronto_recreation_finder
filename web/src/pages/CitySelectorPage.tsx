import { Link } from 'react-router-dom';
import './CitySelectorPage.css';

export default function CitySelectorPage() {
    const GOOGLE_FORM_EMBED_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSe5OWlVTy9aLpPP4DZWO3JHgkJP8Kwyi9DH0B5Xs6u_9m8Wxg/viewform?embedded=true';

    return (
        <div className="city-selector-page">
            <div className="city-selector-container">
                <header className="city-selector-header">
                    <h1>City Recreation Finder</h1>
                    <p>Find drop-in programs and registered activities provided by your city's recreation centres</p>
                </header>

                <section className="available-cities">
                    <h2>Available Cities</h2>
                    <div className="city-grid">
                        <Link to="/toronto" className="city-card">
                            <div className="city-card-icon">🏙️</div>
                            <h3>Toronto</h3>
                            <p>Browse 150+ recreation centres</p>
                        </Link>
                    </div>
                </section>

                <section className="city-request-form">
                    <h2>Don't see your city?</h2>
                    <p>Let us know which city you'd like us to add next!</p>
                    <div className="google-form-embed">
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