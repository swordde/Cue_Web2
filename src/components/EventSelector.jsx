import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EventSelector.module.css'

const EventSelector = ({ onEventSelect, onGiftsSelect, onBack }) => {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedGifts, setSelectedGifts] = useState([])

  const eventTypes = [
    {
      id: 'birthday',
      name: 'Birthday Party',
      icon: '🎂',
      category: 'personal',
      description: 'Celebrate your special day with friends and family'
    },
    {
      id: 'anniversary',
      name: 'Anniversary',
      icon: '💑',
      category: 'personal',
      description: 'Commemorate your love story in a beautiful setting'
    },
    {
      id: 'corporate',
      name: 'Corporate Event',
      icon: '🏢',
      category: 'business',
      description: 'Professional events for your business needs'
    },
    {
      id: 'conference',
      name: 'Conference',
      icon: '📊',
      category: 'business',
      description: 'Host conferences and seminars with ease'
    },
    {
      id: 'workshop',
      name: 'Workshop',
      icon: '🛠️',
      category: 'business',
      description: 'Interactive learning and training sessions'
    },
    {
      id: 'graduation',
      name: 'Graduation',
      icon: '🎓',
      category: 'celebration',
      description: 'Celebrate academic achievements'
    },
    {
      id: 'baby-shower',
      name: 'Baby Shower',
      icon: '👶',
      category: 'celebration',
      description: 'Welcome the new arrival with joy'
    },
    {
      id: 'reunion',
      name: 'Reunion',
      icon: '👥',
      category: 'social',
      description: 'Reconnect with old friends and family'
    },
    {
      id: 'charity',
      name: 'Charity Event',
      icon: '❤️',
      category: 'social',
      description: 'Make a difference with meaningful events'
    },
    {
      id: 'others',
      name: 'Others',
      icon: '🎉',
      category: 'others',
      description: 'Custom events and special occasions'
    }
  ]

  const categories = [
    { id: 'all', name: 'All Events' },
    { id: 'personal', name: 'Personal' },
    { id: 'business', name: 'Business' },
    { id: 'celebration', name: 'Celebration' },
    { id: 'social', name: 'Social' },
    { id: 'others', name: 'Others' }
  ]

  const filteredEvents = selectedCategory === 'all' 
    ? eventTypes 
    : eventTypes.filter(event => event.category === selectedCategory)

  const giftOptions = [
    { id: 'wine', icon: '🍷', name: 'Wine Collection', description: 'Premium wine selection', price: 75 },
    { id: 'flowers', icon: '🌹', name: 'Flower Bouquets', description: 'Beautiful seasonal flowers', price: 35 },
    { id: 'chocolates', icon: '🍫', name: 'Luxury Chocolates', description: 'Artisan chocolate collection', price: 45 },
    { id: 'custom', icon: '🎁', name: 'Custom Gifts', description: 'Personalized options', price: 'Variable' }
  ]

  const handleGiftToggle = (giftId) => {
    setSelectedGifts(prev => 
      prev.includes(giftId) 
        ? prev.filter(id => id !== giftId)
        : [...prev, giftId]
    )
  }

  const getTotalPrice = () => {
    return selectedGifts.reduce((total, giftId) => {
      const gift = giftOptions.find(g => g.id === giftId)
      if (gift && typeof gift.price === 'number') {
        return total + gift.price
      }
      return total
    }, 0)
  }

  const handleBackClick = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/dashboard')
    }
  }

  const handleEventSelection = (event) => {
    if (onEventSelect) {
      onEventSelect(event)
    } else {
      // Navigate to BookingForm with event data
      navigate('/booking-form', { 
        state: { 
          eventType: event,
          selectedGifts: selectedGifts
        }
      })
    }
  }

  const handleGiftsSelection = () => {
    if (onGiftsSelect) {
      onGiftsSelect(selectedGifts)
    } else {
      // Default behavior
      console.log('Selected gifts:', selectedGifts)
    }
  }

  return (
    <div className={styles.eventSelector}>
      {/* Header with Navigation */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBackClick}>
          ← Back to Dashboard
        </button>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Event Management</h1>
          <p className={styles.pageSubtitle}>Plan your perfect event with Cue Club Cafe</p>
        </div>
      </div>

      <div className={styles.eventSelectorContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🎉 Choose Your Event Type</h2>
          <p className={styles.sectionSubtitle}>Select from our premium event packages</p>
        </div>
        
        <div className={styles.categoryFilter}>
          {categories.map(category => (
            <button
              key={category.id}
              className={`${styles.categoryBtn} ${selectedCategory === category.id ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className={styles.eventsGrid}>
          {filteredEvents.map(event => (
            <div
              key={event.id}
              className={styles.eventCard}
              onClick={() => handleEventSelection(event)}
            >
              <div className={styles.cardGlow}></div>
              <div className={styles.eventIcon}>{event.icon}</div>
              <h3 className={styles.eventName}>{event.name}</h3>
              <p className={styles.eventDescription}>{event.description}</p>
              <button className={styles.selectBtn}>Select Event →</button>
            </div>
          ))}
        </div>

        {/* Gift Section */}
        <div className={styles.giftSection}>
          <div className={styles.giftSectionHeader}>
            <h2 className={styles.giftSectionTitle}>🎁 Premium Gift Collection</h2>
            <p className={styles.giftSectionSubtitle}>
              Enhance your event with our curated gift selection
            </p>
          </div>
          
          <div className={styles.giftPreview}>
            <div className={styles.giftPreviewCards}>
              {giftOptions.map(gift => (
                <div
                  key={gift.id}
                  className={`${styles.giftPreviewCard} ${selectedGifts.includes(gift.id) ? styles.selected : ''}`}
                  onClick={() => handleGiftToggle(gift.id)}
                >
                  <div className={styles.giftCardGlow}></div>
                  <div className={styles.giftPreviewIcon}>{gift.icon}</div>
                  <h4 className={styles.giftName}>{gift.name}</h4>
                  <p className={styles.giftDescription}>{gift.description}</p>
                  <span className={styles.giftPrice}>
                    {typeof gift.price === 'number' ? `₹${gift.price}` : gift.price}
                  </span>
                  <div className={styles.giftSelectionIndicator}>
                    {selectedGifts.includes(gift.id) ? '✓ Selected' : 'Click to Select'}
                  </div>
                </div>
              ))}
            </div>
            
            {selectedGifts.length > 0 && (
              <div className={styles.selectedGiftsSummary}>
                <div className={styles.summaryContent}>
                  <h3 className={styles.summaryTitle}>Selected Gifts ({selectedGifts.length})</h3>
                  <div className={styles.selectedList}>
                    {selectedGifts.map(giftId => {
                      const gift = giftOptions.find(g => g.id === giftId)
                      return (
                        <span key={giftId} className={styles.selectedGiftTag}>
                          {gift.icon} {gift.name}
                        </span>
                      )
                    })}
                  </div>
                  <div className={styles.totalPrice}>
                    <strong>
                      Total: ₹{getTotalPrice()}
                      {selectedGifts.includes('custom') && ' + Custom items'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
            
            <div className={styles.giftSectionAction}>
              <button 
                className={styles.exploreGiftsBtn}
                onClick={handleGiftsSelection}
              >
                {selectedGifts.length > 0 ? `Continue with ${selectedGifts.length} Selected Gifts →` : 'Explore All Gifts →'}
              </button>
            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className={styles.backgroundEffects}>
          <div className={styles.floatingOrb}></div>
          <div className={styles.floatingOrb}></div>
          <div className={styles.floatingOrb}></div>
        </div>
      </div>
    </div>
  )
}

export default EventSelector
