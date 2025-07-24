import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './BookingForm.module.css'

const BookingForm = ({ eventType, onBack, onShowGifts, onBookingSubmit }) => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get event type from props or from navigation state
  const selectedEventType = eventType || location.state?.eventType
  
  const [formData, setFormData] = useState({
    // Basic Information
    eventName: '',
    contactName: '',
    email: '',
    phone: '',
    
    // Event Details
    eventDate: '',
    startTime: '',
    endTime: '',
    guestCount: '',
    
    // Event Services
    foodService: '',
    photography: false,
    videography: false,
    decorationTheme: 'Custom',
    customTheme: '',
    themeDescription: '',
    selectedGifts: [],
    customGiftDetails: '',
    
    // Special Requirements
    specialRequests: '',
    accessibility: false,
    additionalServices: []
  })

  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      if (name === 'additionalServices') {
        const updatedServices = checked 
          ? [...formData.additionalServices, value]
          : formData.additionalServices.filter(service => service !== value)
        
        setFormData(prev => ({
          ...prev,
          additionalServices: updatedServices
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: checked
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleGiftToggle = (giftId) => {
    setFormData(prev => ({
      ...prev,
      selectedGifts: prev.selectedGifts.includes(giftId) 
        ? prev.selectedGifts.filter(id => id !== giftId)
        : [...prev.selectedGifts, giftId]
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.eventName.trim()) newErrors.eventName = 'Event name is required'
    if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.eventDate) newErrors.eventDate = 'Event date is required'
    if (!formData.startTime) newErrors.startTime = 'Start time is required'
    if (!formData.endTime) newErrors.endTime = 'End time is required'
    if (!formData.guestCount) newErrors.guestCount = 'Guest count is required'
    if (!formData.decorationTheme) newErrors.decorationTheme = 'Decoration theme is required'
    
    // Custom theme validation
    if (formData.decorationTheme === 'Custom' && !formData.customTheme.trim()) {
      newErrors.customTheme = 'Please specify your custom theme'
    }
    
    // Custom gift validation
    if (formData.selectedGifts.includes('custom') && !formData.customGiftDetails.trim()) {
      newErrors.customGiftDetails = 'Please provide details for your custom gift requirements'
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    // Date validation
    if (formData.eventDate) {
      const selectedDate = new Date(formData.eventDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        newErrors.eventDate = 'Event date cannot be in the past'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validateForm()) {
      // Prepare the final theme information
      const finalTheme = formData.decorationTheme === 'Custom' 
        ? formData.customTheme 
        : formData.decorationTheme

      const submissionData = {
        ...formData,
        eventType: selectedEventType?.id || 'unknown',
        eventTypeName: selectedEventType?.name || 'Unknown Event',
        finalDecorationTheme: finalTheme,
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        submittedAt: new Date().toISOString()
      }

      // Save to localStorage for now (you can integrate with Firebase later)
      const existingBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]')
      existingBookings.push(submissionData)
      localStorage.setItem('eventBookings', JSON.stringify(existingBookings))

      console.log('Event booking submitted:', submissionData)
      
      // Show success message and navigate back
      alert(`✅ Your ${selectedEventType?.name || 'event'} booking request has been submitted successfully! We'll contact you soon.`)
      
      // Call the booking submission callback or navigate back
      if (onBookingSubmit) {
        onBookingSubmit(submissionData)
      } else {
        navigate('/party') // Go back to event selector
      }
    }
  }

  const handleBackClick = () => {
    if (onBack) {
      onBack()
    } else {
      navigate('/party') // Go back to event selector
    }
  }

  const handleShowGifts = () => {
    if (onShowGifts) {
      onShowGifts()
    } else {
      // Could navigate to a gifts page or show a modal
      console.log('Show gifts page')
    }
  }

  const decorationThemes = [
    'Classic Elegant',
    'Modern Minimalist',
    'Vintage Rustic',
    'Garden Party',
    'Royal Palace',
    'Beach Paradise',
    'Winter Wonderland',
    'Bohemian Chic',
    'Hollywood Glamour',
    'Fairy Tale',
    'Traditional',
    'Contemporary',
    'Custom'
  ]

  const giftOptions = [
    { id: 'welcome-hamper', name: 'Welcome Hamper', price: '₹25', description: 'Gourmet snacks and treats in a beautiful basket' },
    { id: 'flower-bouquet', name: 'Fresh Flower Bouquet', price: '₹35', description: 'Beautiful seasonal flowers arranged by expert florists' },
    { id: 'wine-collection', name: 'Wine Collection', price: '₹75', description: 'Curated selection of premium wines' },
    { id: 'chocolate-box', name: 'Luxury Chocolate Box', price: '₹45', description: 'Handcrafted artisan chocolates' },
    { id: 'spa-voucher', name: 'Spa Voucher', price: '₹100', description: 'Relaxing spa experience at partner locations' },
    { id: 'photo-frame', name: 'Custom Photo Frame', price: '₹30', description: 'Personalized keepsake with event details' },
    { id: 'champagne-set', name: 'Champagne Celebration Set', price: '₹95', description: 'Premium champagne with elegant flutes' },
    { id: 'dessert-platter', name: 'Gourmet Dessert Platter', price: '₹65', description: 'Assorted mini desserts and pastries' },
    { id: 'gift-card', name: 'Gift Card Collection', price: '₹50', description: 'Versatile gift cards for various experiences' },
    { id: 'memory-book', name: 'Memory Book', price: '₹40', description: 'Beautiful album for event photos and memories' },
    { id: 'candle-set', name: 'Luxury Candle Set', price: '₹35', description: 'Premium scented candles in elegant packaging' },
    { id: 'jewelry-box', name: 'Jewelry Gift Box', price: '₹85', description: 'Elegant jewelry pieces for special occasions' },
    { id: 'tea-coffee-set', name: 'Premium Tea & Coffee Set', price: '₹55', description: 'Gourmet tea and coffee collection' },
    { id: 'plant-arrangement', name: 'Plant Arrangement', price: '₹40', description: 'Beautiful potted plants and succulents' },
    { id: 'custom', name: 'Custom Gift', price: 'Variable', description: 'Tell us your specific requirements' }
  ]

  // If no event type is available, redirect back
  if (!selectedEventType) {
    return (
      <div className={styles.bookingForm}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={handleBackClick}>
            ← Back to Events
          </button>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>No Event Selected</h1>
            <p className={styles.pageSubtitle}>Please select an event type first</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bookingForm} style={{
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden',
      padding: 'clamp(8px, 2vw, 20px)'
    }}>
      {/* Mobile-friendly Header with Navigation */}
      <div className={styles.header} style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '12px 16px',
        borderRadius: '0 0 16px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        border: '1px solid rgba(255, 193, 7, 0.2)'
      }}>
        <button 
          className={styles.backButton} 
          onClick={handleBackClick}
          style={{
            padding: '8px 16px',
            fontSize: '0.9rem',
            minWidth: 'auto',
            whiteSpace: 'nowrap'
          }}
        >
          ← Back
        </button>
        <div className={styles.headerContent} style={{
          flex: 1,
          textAlign: 'center',
          minWidth: '120px'
        }}>
          <div className={styles.eventInfo}>
            <span className={styles.eventIcon} style={{
              fontSize: 'clamp(1.5rem, 6vw, 2rem)'
            }}>
              {selectedEventType.icon}
            </span>
            <h1 className={styles.pageTitle} style={{
              fontSize: 'clamp(1.2rem, 4vw, 1.8rem)',
              margin: '4px 0',
              lineHeight: 1.2
            }}>
              Book {selectedEventType.name}
            </h1>
            <p className={styles.pageSubtitle} style={{
              fontSize: 'clamp(0.8rem, 2.5vw, 1rem)',
              margin: 0,
              display: window.innerWidth > 480 ? 'block' : 'none'
            }}>
              Complete the form below
            </p>
          </div>
        </div>
        <div style={{minWidth: '80px'}}></div> {/* Spacer for balance */}
      </div>

      <div className={styles.bookingFormContent} style={{
        width: '100%',
        maxWidth: '100%',
        padding: '0 8px'
      }}>
        <form onSubmit={handleSubmit} className={styles.form} style={{
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          {/* Basic Information Section */}
          <div className={styles.formSection} style={{
            marginBottom: '24px',
            padding: 'clamp(16px, 4vw, 24px)',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 193, 7, 0.2)'
          }}>
            <h3 className={styles.sectionHeading} style={{
              fontSize: 'clamp(1.1rem, 3.5vw, 1.3rem)',
              marginBottom: '16px',
              color: '#ffc107'
            }}>📋 Basic Information</h3>
            <div className={styles.formGrid} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'clamp(12px, 3vw, 20px)'
            }}>
              <div className={styles.formGroup} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label htmlFor="eventName" style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>Event Name *</label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleInputChange}
                  className={errors.eventName ? styles.error : ''}
                  placeholder="Enter your event name"
                  style={{
                    padding: 'clamp(10px, 2.5vw, 14px)',
                    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 193, 7, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    width: '100%'
                  }}
                />
                {errors.eventName && (
                  <span className={styles.errorText} style={{
                    fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                    color: '#ff6b6b'
                  }}>
                    {errors.eventName}
                  </span>
                )}
              </div>

              <div className={styles.formGroup} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label htmlFor="contactName" style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>Contact Name *</label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  className={errors.contactName ? styles.error : ''}
                  placeholder="Your full name"
                  style={{
                    padding: 'clamp(10px, 2.5vw, 14px)',
                    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 193, 7, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    width: '100%'
                  }}
                />
                {errors.contactName && (
                  <span className={styles.errorText} style={{
                    fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                    color: '#ff6b6b'
                  }}>
                    {errors.contactName}
                  </span>
                )}
              </div>

              <div className={styles.formGroup} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <label htmlFor="email" style={{
                  fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}>Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? styles.error : ''}
                  placeholder="your.email@example.com"
                  style={{
                    padding: 'clamp(10px, 2.5vw, 14px)',
                    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 193, 7, 0.3)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    width: '100%'
                  }}
                />
                {errors.email && (
                  <span className={styles.errorText} style={{
                    fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                    color: '#ff6b6b'
                  }}>
                    {errors.email}
                  </span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? styles.error : ''}
                  placeholder="(123) 456-7890"
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* Event Details Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>📅 Event Details</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="eventDate">Event Date *</label>
                <input
                  type="date"
                  id="eventDate"
                  name="eventDate"
                  value={formData.eventDate}
                  onChange={handleInputChange}
                  className={errors.eventDate ? styles.error : ''}
                />
                {errors.eventDate && <span className={styles.errorText}>{errors.eventDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="startTime">Start Time *</label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className={errors.startTime ? styles.error : ''}
                />
                {errors.startTime && <span className={styles.errorText}>{errors.startTime}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endTime">End Time *</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={errors.endTime ? styles.error : ''}
                />
                {errors.endTime && <span className={styles.errorText}>{errors.endTime}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="guestCount">Number of Guests *</label>
                <input
                  type="number"
                  id="guestCount"
                  name="guestCount"
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  className={errors.guestCount ? styles.error : ''}
                  placeholder="Enter guest count"
                  min="1"
                />
                {errors.guestCount && <span className={styles.errorText}>{errors.guestCount}</span>}
              </div>
            </div>
          </div>

          {/* Event Services Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>🍽️ Event Services</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="foodService">Food Service</label>
                <select
                  id="foodService"
                  name="foodService"
                  value={formData.foodService}
                  onChange={handleInputChange}
                >
                  <option value="">Select food service</option>
                  <option value="full-catering">Full Catering Service</option>
                  <option value="buffet">Buffet Style</option>
                  <option value="cocktail">Cocktail & Appetizers</option>
                  <option value="dessert-only">Dessert Only</option>
                  <option value="beverages-only">Beverages Only</option>
                  <option value="no-food">No Food Service</option>
                </select>
              </div>
            </div>

            <div className={styles.checkboxGroup}>
              <h4>📸 Professional Services</h4>
              <div className={styles.checkboxGrid}>
                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    name="photography"
                    checked={formData.photography}
                    onChange={handleInputChange}
                  />
                  <label>Professional Photography</label>
                </div>

                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    name="videography"
                    checked={formData.videography}
                    onChange={handleInputChange}
                  />
                  <label>Professional Videography</label>
                </div>
              </div>
            </div>
          </div>

          {/* Decoration & Theme Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>🎨 Decoration & Theme</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="decorationTheme">Decoration Theme *</label>
                <select
                  id="decorationTheme"
                  name="decorationTheme"
                  value={formData.decorationTheme}
                  onChange={handleInputChange}
                  className={errors.decorationTheme ? styles.error : ''}
                >
                  <option value="">Select decoration theme</option>
                  {decorationThemes.map(theme => (
                    <option key={theme} value={theme}>{theme}</option>
                  ))}
                </select>
                {errors.decorationTheme && <span className={styles.errorText}>{errors.decorationTheme}</span>}
              </div>

              {/* Custom Theme Input - Shows when Custom is selected */}
              {formData.decorationTheme === 'Custom' && (
                <div className={styles.formGroup}>
                  <label htmlFor="customTheme">Specify Your Custom Theme *</label>
                  <input
                    type="text"
                    id="customTheme"
                    name="customTheme"
                    value={formData.customTheme}
                    onChange={handleInputChange}
                    className={errors.customTheme ? styles.error : ''}
                    placeholder="Enter your custom theme name"
                  />
                  {errors.customTheme && <span className={styles.errorText}>{errors.customTheme}</span>}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="themeDescription">Theme Description & Special Requests</label>
              <textarea
                id="themeDescription"
                name="themeDescription"
                value={formData.themeDescription}
                onChange={handleInputChange}
                rows="4"
                placeholder={
                  formData.decorationTheme 
                    ? `Describe your ${formData.decorationTheme === 'Custom' ? formData.customTheme || 'custom' : formData.decorationTheme} theme vision, color preferences, special decorative elements, or any specific requirements...`
                    : "Describe your theme vision, color preferences, special decorative elements, or any specific requirements..."
                }
              />
            </div>
          </div>

          {/* Gift Options Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>🎁 Gift Options</h3>
            <p className={styles.sectionDescription}>Select multiple gifts to make your event extra special</p>
            
            <div className={styles.giftSelection}>
              <div className={styles.giftGrid}>
                {giftOptions.map(gift => (
                  <div 
                    key={gift.id}
                    className={`${styles.giftCard} ${formData.selectedGifts.includes(gift.id) ? styles.selected : ''}`}
                    onClick={() => handleGiftToggle(gift.id)}
                  >
                    <div className={styles.giftIcon}>🎁</div>
                    <h4 className={styles.giftName}>{gift.name}</h4>
                    <span className={styles.giftPrice}>{gift.price}</span>
                    <p className={styles.giftDescription}>{gift.description}</p>
                    <div className={styles.giftSelectionIndicator}>
                      {formData.selectedGifts.includes(gift.id) ? '✓ Selected' : 'Click to Select'}
                    </div>
                  </div>
                ))}
              </div>
              
              {formData.selectedGifts.length > 0 && (
                <div className={styles.selectedGiftsSummary}>
                  <div className={styles.summaryContent}>
                    <h4 className={styles.summaryTitle}>Selected Gifts ({formData.selectedGifts.length})</h4>
                    <div className={styles.selectedList}>
                      {formData.selectedGifts.map(giftId => {
                        const gift = giftOptions.find(g => g.id === giftId)
                        return (
                          <span key={giftId} className={styles.selectedGiftTag}>
                            {gift.name} - {gift.price}
                            <button 
                              type="button" 
                              className={styles.removeGift}
                              onClick={() => handleGiftToggle(giftId)}
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                    <div className={styles.totalPrice}>
                      <strong>
                        Total Items: {formData.selectedGifts.length}
                        {formData.selectedGifts.includes('custom') && ' (Custom pricing applies)'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formData.selectedGifts.includes('custom') && (
              <div className={styles.formGroup}>
                <label htmlFor="customGiftDetails">Custom Gift Requirements *</label>
                <textarea
                  id="customGiftDetails"
                  name="customGiftDetails"
                  value={formData.customGiftDetails}
                  onChange={handleInputChange}
                  className={errors.customGiftDetails ? styles.error : ''}
                  rows="4"
                  placeholder="Please describe your custom gift requirements in detail..."
                />
                {errors.customGiftDetails && <span className={styles.errorText}>{errors.customGiftDetails}</span>}
              </div>
            )}

            <div className={styles.giftNote}>
              <p><strong>Note:</strong> Visit our <button type="button" className={styles.giftButton} onClick={handleShowGifts}>Gift Gallery</button> to explore detailed descriptions and see all available options.</p>
            </div>
          </div>

          {/* Special Requirements Section */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionHeading}>📋 Special Requirements</h3>
            <div className={styles.specialRequirements}>
              <div className={styles.formGroup}>
                <label htmlFor="specialRequests">Special Requests or Notes</label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Any special requirements, dietary restrictions, or additional information..."
                />
              </div>

              <div className={styles.checkboxGroup}>
                <h4>Additional Requirements</h4>
                <div className={styles.checkboxItem}>
                  <input
                    type="checkbox"
                    name="accessibility"
                    checked={formData.accessibility}
                    onChange={handleInputChange}
                  />
                  <label>Accessibility accommodations needed</label>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.cancelButton} onClick={handleBackClick}>
              ← Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              Submit Booking Request 🎉
            </button>
          </div>
        </form>

        {/* Background Effects */}
        <div className={styles.backgroundEffects}>
          <div className={styles.floatingOrb}></div>
          <div className={styles.floatingOrb}></div>
        </div>
      </div>
    </div>
  )
}

export default BookingForm
