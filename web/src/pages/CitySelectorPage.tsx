import { useState } from 'react';
import { Link } from 'react-router-dom';
import './CitySelectorPage.css';

export default function CitySelectorPage() {
    const [cityRequest, setCityRequest] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cityRequest.trim()) return;

        console.log('City requested:', cityRequest);

        setSubmitted(true);
        setTimeout(() => {
            setSubmitted(false);
            setCityRequest('');
        }, 3000);
    };

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
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <input
                                type="text"
                                value={cityRequest}
                                onChange={(e) => setCityRequest(e.target.value)}
                                placeholder="Enter your city name..."
                                disabled={submitted}
                            />
                            <button 
                                type="submit"
                                className="submit-button"
                                disabled={submitted || !cityRequest.trim()}
                            >
                                {submitted ? '✓ Submitted!' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                    {submitted && (
                        <p className="success-message">
                            Thank you for your request! We'll add your city - {cityRequest} - as soon as possible.
                        </p>
                    )}
                </section>

                <footer className="city-selector-footer">
                    <p>More cities coming soon based on demand</p>
                </footer>
            </div>
        </div>
    );
}