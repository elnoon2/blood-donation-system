import { Link } from "react-router";
import { Droplet, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-2">
                <Droplet className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-semibold text-white">Smart Blood Donation</span>
            </div>
            <p className="text-sm text-gray-400">
              Connecting donors with those in need. Save lives through the power of blood donation.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/search-donors" className="text-sm hover:text-primary transition-colors">
                  Find Donors
                </Link>
              </li>
              <li>
                <Link to="/request-blood" className="text-sm hover:text-primary transition-colors">
                  Request Blood
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-primary transition-colors">
                  Register as Donor
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="text-sm hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://www.who.int/news-room/fact-sheets/detail/blood-safety-and-availability" target="_blank" rel="noreferrer" className="text-sm hover:text-primary transition-colors">
                  About Blood Donation
                </a>
              </li>
              <li>
                <a href="https://www.redcrossblood.org/donate-blood/how-to-donate/eligibility-requirements.html" target="_blank" rel="noreferrer" className="text-sm hover:text-primary transition-colors">
                  Eligibility Criteria
                </a>
              </li>
              <li>
                <a href="https://www.who.int/campaigns/world-blood-donor-day/2018/who-can-give-blood" target="_blank" rel="noreferrer" className="text-sm hover:text-primary transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <Link to="/design-system" className="text-sm hover:text-primary transition-colors">
                  Design System
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-primary" />
                <span>+20 (100) 123-4567</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-primary" />
                <span>support@lifeflow.com</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>123 Nile Street, Maadi, Cairo</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Smart Blood Donation System. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}