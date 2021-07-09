/* * * * * * * * EVENT PAGE DATA * * * * * * * * 
 *
 * How pretty can I get away with making this page?
 * 
 * HEADER DATA
 * - Title
 * - Show day, date & time
 * - Address
 * - Main Image
 * 
 * MAIN BODY
 * - Description
 * - Concessions description
 * - Location Map
 * - Contact Information
 * - Optional Additional Images
 * 
 * * * * * * * * * * * * * * * * * * * * * * * */ 
import React, { useState } from 'react'
import { addItem } from '../cart/cartSlice'
import { useAppDispatch } from '../../app/hooks'
import { appSelector } from '../../app/hooks'
import { useParams } from 'react-router-dom'
import { selectEventByName } from './eventsSlice'

import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/styles'
import Card from '@material-ui/core/Card';
import CardMedia from '@material-ui/core/CardMedia'
import CardContent from '@material-ui/core/CardContent'
import CardActions from '@material-ui/core/CardActions'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import { ThemeProvider } from '@material-ui/core/styles'
import { theme } from '../../theme'
import { openSnackbar } from '../snackbarSlice'

const useStyles = makeStyles((theme) => ({
    cardRoot: {
        display: 'flex',
        height: '400px',
        marginBottom: 40,
    },
    cardContents: {
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        flex: 'auto',
    },
    heroImage: {
        width: '500px',
    },
    cardActions: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
    },  
    qtyField: {
        maxWidth: '100px',
    },
    showtime: {
        textAlign: 'center'
    }
}))

interface BodySectionProps { heading: string, contents: string }
function EventBodySection(props: BodySectionProps) {
    return (
        <section>
            <Typography component="h2" variant="h4" gutterBottom>{props.heading}</Typography>
            <Typography variant="body1" paragraph>{props.contents}</Typography>
        </section>
    )
}

type EventPageProps = { playname: string }
export default function EventPage() {

    const { id } = useParams<EventPageProps>()
    const eventData = appSelector(state => selectEventById(state, id))
    const classes = useStyles()
    const dispatch = useAppDispatch() 
    const [amount, setAmount] = useState(0)

    const { playname } = useParams<EventPageProps>()

    const eventData = appSelector(state => selectEventByName(state, playname))
    if (eventData === undefined) return <p>Whoops! Event not found</p>
    

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const ticketData = {
            eventId: id,
            // showing: eventData.date,
            concessions: false,
            // unitPrice: 12.99,
            qty: amount,
            description: eventData.shortDesc,
            name: 'Ticket(s) for ' + eventData.playname,
        }
        // dispatch(addTicket(ticketData, cartData))
        dispatch(addItem(ticketData))
        dispatch(openSnackbar(`Added ${amount} ticket${amount == 1 ? "" : "s"} to cart!`))
    }

    // TODO: Render showtime & date
    return (
        <ThemeProvider theme={theme}>
            <Card className={classes.cardRoot}>
                <CardMedia className={classes.heroImage} image={imgUrl}/>
                <CardContent className={classes.cardContents}>
                    <Typography component="h1" variant="h3" align="center" gutterBottom>{eventName}</Typography>
                    {/* <Showtime align='center' date={date} /> */}
                    {/* <Typography variant="subtitle2" align="center">{address}</Typography> */}

                    <CardActions className={classes.cardActions}>
                        <TextField
                            className={classes.qtyField}
                            required
                            value={amount || undefined}
                            onChange={(e) => setAmount(+e.target.value)}
                            label="Quantity"
                            type="number"
                        />
                        <Button disabled={!amount} color="primary" variant="contained" onClick={handleSubmit}>Get Tickets</Button>
                    </CardActions>
                </CardContent>
            </Card>
        </ThemeProvider>
    )
}

