import { Link } from 'react-router-dom';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { trackEvent } from '../lib/analytics';
import './Navbar.css';

type NavbarVariant = 'home' | 'search';

type NavbarProps = {
    variant: NavbarVariant;
    city?: string;
};

export default function Navbar({ variant, city }: NavbarProps) {
    const handleLogoClick = () => {
        trackEvent(`${variant}_logo_clicked`, {
            from_page: variant === 'home' ? 'landing' : 'search',
        });
    };

    const handleExploreToronto = () => {
        trackEvent('home_explore_toronto_clicked', {
            source: 'navbar',
        });
    };

    const handleHowItWorks = () => {
        trackEvent('toronto_how_it_works_clicked', {
            source: 'navbar',
        });
    };

    return (
        <nav className="navbar">
            <div className="navbar__content">
                <Link to='/' className="navbar__logo-link" onClick={handleLogoClick}>
                    <img
                        src="/logo.png"
                        alt="City Recreation Finder"
                        className="navbar__logo"
                    />
                </Link>

                <div className="navbar__right">
                    {variant === 'home' && (
                        <Link
                            to="/toronto"
                            className="navbar__cta-button"
                            onClick={handleExploreToronto}
                        >
                            Explore Toronto
                        </Link>
                    )}

                    {variant === 'search' && (
                        <>
                            {city && (
                                <div className="navbar__city-pill">
                                    <HiOutlineMapPin size={14} />
                                    <span>{city}</span>
                                </div>
                            )}

                            <a
                                href="/#how-it-works"
                                className="navbar__link"
                                onClick={handleHowItWorks}
                            >
                                How it works
                            </a>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}