import { useState } from 'react';


const ConvCard = ({conv}) => {


    return (
        <>
            <div className='flex bg-chess-dark hover:bg-chess-hover rounded-lg gap-2 p-2'>
                <div className="avatar">
                    <div className="w-12 rounded-full">
                        <img src="https://placeimg.com/192/192/people" />
                    </div>
                </div>
                <div>
                    <p className='font-bold'>{conv.you_talk_to}</p>
                    {
                        conv.last_message ?
                        <p className='line-clamp-1'>{conv.last_message}</p>
                        :
                        <p>No messages yet</p>
                    }
                </div>
            </div>
        </>
    )
}

export default ConvCard;