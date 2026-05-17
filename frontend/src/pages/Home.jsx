import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import './Home.css'

const heroImage =
  'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=1800&q=85'

const ovenImage =
  'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1100&q=85'

const collections = [
  {
    tag: 'Ultra Premium',
    title: 'Truffle & Burrata',
    description:
      'Winter black truffles, hand-stretched burrata, and 3D-thermal infused rosemary oil.',
    price: '$32.00',
    image:
      'https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=900&q=85',
  },
  {
    tag: 'Signature',
    title: 'Aged Pepperoni',
    description:
      '90-day aged wagyu pepperoni, buffalo mozzarella, and San Marzano micro-reduction.',
    price: '$28.00',
    image:
      'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=900&q=85',
  },
  {
    tag: 'Seasonal',
    title: 'The Golden Harvest',
    description:
      'Heirloom saffron tomatoes, roasted garlic silk, and 24k edible gold-pressed basil.',
    price: '$45.00',
    image:
      'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=900&q=85',
  },
]

const processItems = [
  {
    title: 'Molecular Layering',
    text: 'Automated placement of ingredients ensures the perfect crust-to-sauce ratio in every bite.',
  },
  {
    title: 'Thermal Zoning',
    text: 'Independent heat control for toppings versus crust, preventing soggy bases and burnt cheese.',
  },
  {
    title: 'Hyper-Rapid Delivery',
    text: 'Our logistics network is synced with the crafting process for zero-latency fulfillment.',
  },
]

const testimonials = [
  {
    quote:
      'The texture profile of the crust was mathematically perfect. I have never experienced consistency like this in artisan food.',
    name: 'Marcus Chen',
    role: 'Tech Lead, Aether Corp',
  },
  {
    quote:
      'Finally, a luxury dining experience that respects the speed of the modern world without sacrificing the soul of the recipe.',
    name: 'Elara Vance',
    role: 'Executive Chef, L Orbiten',
  },
  {
    quote:
      'The Truffle and Burrata is a masterpiece of technical execution. The thermal zoning makes a massive difference.',
    name: 'Julian Ross',
    role: 'Design Director, Prism',
  },
]

function Home() {
  return (
    <div className="landing-page">
      <Navbar />

      <main>
        <section className="hero-section" style={{ '--hero-image': `url(${heroImage})` }}>
          <div className="gold-drip" aria-hidden="true"></div>
          <div className="hero-content">
            <p className="eyebrow">Culinary Engineering</p>
            <h1>
              Precision-crafted <span>flavor.</span>
            </h1>
            <p>
              Experience the pinnacle of artisan pizza through our proprietary
              3D-thermal technology. Delivered to your doorstep in 30 minutes
              with mathematical flavor accuracy.
            </p>
            <div className="hero-actions">
              <button type="button">Explore the Collections</button>
              <button className="ghost" type="button">
                Technical Specs
              </button>
            </div>
          </div>
        </section>

        <section className="collection-section">
          <p className="eyebrow center">Curated Selection</p>
          <h2>The 2024 Collection</h2>

          <div className="collection-grid">
            {collections.map((item) => (
              <article className="collection-card" key={item.title}>
                <div className="card-image">
                  <img src={item.image} alt={item.title} />
                  <span>{item.tag}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <div className="card-footer">
                  <strong>{item.price}</strong>
                  <button type="button" aria-label={`Add ${item.title}`}>
                    +
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="process-section">
          <div className="process-copy">
            <p className="eyebrow">The Science of Flavor</p>
            <h2>3D Crafting Process</h2>
            <p className="lead">
              Our proprietary 3D-thermal technology is not just a gimmick. It is
              precision engineering for your palate. We map every ingredient to
              its optimal thermal profile.
            </p>

            <div className="process-list">
              {processItems.map((item, index) => (
                <article key={item.title}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="oven-card">
            <img src={ovenImage} alt="Precision pizza crafting oven" />
          </div>
        </section>

        <section className="testimonial-section">
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <span className="stars">*****</span>
                <p>"{item.quote}"</p>
                <div className="profile">
                  <span></span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.role}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Home
