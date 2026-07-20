import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineMapPin } from 'react-icons/hi2';
import { MdCheck, MdChevronRight, MdExpandMore } from 'react-icons/md';
import { CITIES } from '../lib/cities';
import { trackEvent } from '../lib/analytics';
import './Navbar.css';

type NavbarVariant = 'home' | 'search';

type NavbarProps = {
    variant: NavbarVariant;
    city?: string;
};

export default function Navbar({ variant, city }: NavbarProps) {
    const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
    const cityMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isCityMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (cityMenuRef.current && !cityMenuRef.current.contains(event.target as Node)) {
                setIsCityMenuOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsCityMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isCityMenuOpen]);

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

    const handleCityMenuToggle = () => {
        if (!isCityMenuOpen) {
            trackEvent('navbar_city_switcher_opened', {
                current_city: city ?? 'unknown',
            });
        }
        setIsCityMenuOpen((open) => !open);
    };

    const handleCitySelect = (cityName: string) => {
        trackEvent('city_selected', {
            city: cityName,
            source: 'navbar',
        });
        setIsCityMenuOpen(false);
    };

    return (
        <nav className={variant === 'search' ? 'navbar navbar--compact' : 'navbar'}>
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
                            className="navbar__city-pill navbar__city-pill--link"
                            onClick={handleExploreToronto}
                        >
                            <HiOutlineMapPin size={14} />
                            <span>Explore Toronto</span>
                            <MdChevronRight size={14} />
                        </Link>
                    )}

                    {variant === 'search' && (
                        <>
                            <div className="navbar__city-switcher" ref={cityMenuRef}>
                                <button
                                    type="button"
                                    className="navbar__city-pill"
                                    aria-haspopup="menu"
                                    aria-expanded={isCityMenuOpen}
                                    onClick={handleCityMenuToggle}
                                >
                                    <HiOutlineMapPin size={14} />
                                    <span>{city ?? 'Choose a city'}</span>
                                    <MdExpandMore size={16} className="navbar__city-pill-chevron" />
                                </button>

                                {isCityMenuOpen && (
                                    <div className="navbar__city-menu" role="menu">
                                        {CITIES.map((option) => (
                                            <Link
                                                key={option.slug}
                                                to={option.path}
                                                role="menuitem"
                                                className={
                                                    option.name === city
                                                        ? 'navbar__city-menu-item navbar__city-menu-item--active'
                                                        : 'navbar__city-menu-item'
                                                }
                                                onClick={() => handleCitySelect(option.name)}
                                            >
                                                <span>{option.name}</span>
                                                {option.name === city && <MdCheck size={16} />}
                                            </Link>
                                        ))}

                                        <Link
                                            to="/#request-city"
                                            className="navbar__city-menu-footer"
                                            onClick={() => setIsCityMenuOpen(false)}
                                        >
                                            Don't see your city?
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <Link
                                to="/#how-it-works"
                                className="navbar__link"
                                onClick={handleHowItWorks}
                            >
                                How it works
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
