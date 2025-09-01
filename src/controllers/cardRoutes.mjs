import Card from '../schemas/cardSchema.mjs';
import Customer from '../schemas/customerSchema.mjs';
import Driver from '../schemas/driverSchema.mjs';


export const addCard = async (req, res) => {
    try {
        const { cardNumber, cardHolderName, expiryDate, cvv } = req.body;
        const customerId = req.user._id; // Assuming user is authenticated and customerId is available

        // Validate required fields
        if (!cardNumber || !cardHolderName || !expiryDate || !cvv) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Create a new card
        const card = new Card({
            cardNumber,
            cardHolderName,
            expiryDate,
            cvv,
            customer: customerId
        });

        await card.save();

        // Update customer's cards array
        await Customer.findByIdAndUpdate(customerId, { $push: { cards: card._id } });

        res.status(201).json({ message: 'Card added successfully.', card });
    } catch (err) {
        console.error('Error adding card:', err);
        res.status(500).json({ message: 'Failed to add card.', error: err.message });
    }
}
