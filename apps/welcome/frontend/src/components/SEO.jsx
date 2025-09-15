import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component for managing meta tags dynamically
 * @param {Object} props
 * @param {string} props.title - Page title (will be appended with site name)
 * @param {string} props.description - Page description
 * @param {boolean} props.noindex - Set to true for pages that shouldn't be indexed
 */
const SEO = ({ 
  title = 'AI Preventive Maintenance Plan Generator',
  description = 'Generate preventive maintenance plans in minutes. ArcTecFox uses AI to produce task details, intervals, and schedules—delivered as a clean Excel (plus optional PDF). No sign-up required to try.',
  noindex = false 
}) => {
  const location = useLocation();
  const baseUrl = 'https://arctecfox.ai';
  const canonicalUrl = `${baseUrl}${location.pathname}`;
  
  // Format title with site name
  const fullTitle = title === 'ArcTecFox' ? title : `${title} | ArcTecFox`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots meta */}
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}
      
      {/* Open Graph tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      
      {/* Twitter Card tags */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
};

export default SEO;