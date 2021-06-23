// import bodyParser from 'body-parser';
import express from 'express';
import {pool} from './db';
import cors from 'cors';
import Stripe from "stripe"
import { CartItem, TicketData } from "../src/features/cart/cartSlice"

let stripe = new Stripe(process.env.PRIVATE_STRIPE_KEY, {apiVersion: "2020-08-27"})

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// function getUser(req: Request, res: Response) {
//     const id = req.params.id;
//     res.send({express: `Requested data for user ID: ${id}`});
// };

// app.get('/api/users/:id', getUser);

// function postMessages(req: Request, res: Response) {
//     console.log(`I received your POST request. This is what you sent me: ${req.body.post}`)
//     res.send(
//         `I received your POST request. This is what you sent me: ${req.body.post}`
//     );
// };
// app.post('/api/messages', postMessages);

app.get('/api/doorlist', async (req, res) => {
    try{
        const doorlist = await pool.query("SELECT * FROM exdoorlist");
        res.json(doorlist.rows);
    }
    catch(err) {
        console.error(err.message);
    }
});

app.post('/api/checkout', async (req, res) => {
    console.log(req.body)
    const data: CartItem<TicketData>[] = req.body;
    console.log(data)
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: data.map(item => ({
            price_data: {
                currency: "usd",
                product_data: {
                    name: item.name,
                    description: item.description
                },
                unit_amount: item.unitPrice * 100
            },
            quantity: item.quantity
        })),
        mode: "payment",
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000",
    })
    res.json({id: session.id})
});

// tslint:disable-next-line:no-console
app.listen(port, () => console.log(`Listening on port ${port}`));
